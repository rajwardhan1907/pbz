import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCustomerSchema, insertJobSchema, insertExpenseSchema, 
  insertInventorySchema, insertNoteSchema, insertTravelSchema, 
  insertWorkerSchema, insertAttendanceSchema, insertUserSchema 
} from "@shared/schema";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";
import pgSession from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = pgSession(session);
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, png, webp) are allowed"));
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(session({
    store: new PostgresSessionStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid username" });
      }
      if (!(await comparePassword(password, user.password))) {
        return done(null, false, { message: "Invalid password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.user) return res.status(401).json(null);
    res.json(req.user);
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    const data = insertUserSchema.parse(req.body);
    const existing = await storage.getUserByUsername(data.username);
    if (existing) return res.status(400).json({ message: "Username exists" });
    
    const hashedPassword = await hashPassword(data.password);
    const user = await storage.createUser({ ...data, password: hashedPassword });
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      res.status(201).json(user);
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({});
    });
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const customers = await storage.getCustomers(userId);
    res.json(customers);
  });

  app.get("/api/customers/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const customer = await storage.getCustomer(id, userId);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const customerJobs = (await storage.getJobs(userId)).filter(j => j.customerId === id);
    const jobIds = customerJobs.map(j => j.id);
    const customerExpenses = (await storage.getExpenses(userId)).filter(e => jobIds.includes(e.jobId as number));
    const customerTravel = (await storage.getTravelLogs(userId)).filter(t => jobIds.includes(t.jobId as number));
    const allAttendance = await storage.getAttendance(userId);
    const customerAttendance = allAttendance.filter(a => jobIds.includes(a.jobId as number));
    const allWorkers = await storage.getWorkers(userId);
    const allInventory = await storage.getInventory(userId);

    const workerIdsOnJobs = Array.from(new Set(customerAttendance.map(a => a.workerId)));
    
    const deployedWorkers: any[] = [];
    for (const workerId of workerIdsOnJobs) {
      const worker = allWorkers.find(w => w.id === workerId);
      if (worker) {
        const workerAttendance = customerAttendance.filter(a => a.workerId === workerId);
        const workerJobIds = Array.from(new Set(workerAttendance.map(a => a.jobId)));
        for (const jobId of workerJobIds) {
          deployedWorkers.push({
            ...worker,
            jobId: jobId
          });
        }
      }
    }

    const customerInventory = allInventory.filter(item => 
      item.assignedToJobId && jobIds.includes(item.assignedToJobId)
    );

    const materials = customerInventory.map(item => ({
      id: item.id,
      item: {
        id: item.id,
        name: item.name,
        unit: item.unit,
        assignedToJobId: item.assignedToJobId,
        category: item.category
      },
      quantity: Number(item.quantity),
      costAtTime: Number(item.costPerUnit)
    }));

    const laborTotal = customerAttendance.reduce((acc, a) => {
      const worker = allWorkers.find(w => w.id === a.workerId);
      const status = (a.status || "").toLowerCase();
      const multiplier = status === 'full' ? 1 : status === 'half' ? 0.5 : 0;
      const amount = (Number(worker?.dailyWage || 0) * multiplier) + Number((a as any).extraAllowance || 0);
      return acc + amount;
    }, 0);

    const totalAgreed = customerJobs.reduce((acc, j) => acc + Number(j.agreedAmount || 0), 0);
    const totalPaid = customerJobs.reduce((acc, j) => acc + Number(j.paidAmount || 0), 0);
    const totalExpenses = customerExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const totalTravel = customerTravel.reduce((acc, t) => acc + Number(t.fuelCost), 0);

    res.json({
      customer,
      jobs: customerJobs,
      workers: deployedWorkers,
      materials: materials,
      stats: {
        totalAgreed,
        totalPaid,
        totalExpenses: totalExpenses + laborTotal,
        totalTravel,
        totalManpower: laborTotal,
        netProfit: totalPaid - (totalExpenses + laborTotal) - totalTravel
      }
    });
  });

  app.post("/api/customers", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = insertCustomerSchema.parse(req.body);
    const customer = await storage.createCustomer(data, userId);
    res.status(201).json(customer);
  });

  app.put("/api/customers/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const data = insertCustomerSchema.partial().parse(req.body);
    const customer = await storage.updateCustomer(id, userId, data);
    res.json(customer);
  });

  app.delete("/api/customers/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteCustomer(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Jobs
  app.get("/api/jobs", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const jobs = await storage.getJobs(userId);
    res.json(jobs);
  });

  app.post("/api/jobs", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = insertJobSchema.parse(req.body);
    const job = await storage.createJob(data, userId);
    res.status(201).json(job);
  });

  app.put("/api/jobs/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const data = insertJobSchema.partial().parse(req.body);
    const job = await storage.updateJob(id, userId, data);
    res.json(job);
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteJob(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Expenses
  app.get("/api/expenses", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const expenses = await storage.getExpenses(userId);
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = insertExpenseSchema.parse(req.body);
    const expense = await storage.createExpense(data, userId);
    res.status(201).json(expense);
  });

  app.put("/api/expenses/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const data = insertExpenseSchema.partial().parse(req.body);
    const expense = await storage.updateExpense(id, userId, data);
    res.json(expense);
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteExpense(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Inventory
  app.get("/api/inventory", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const items = await storage.getInventory(userId);
    res.json(items);
  });

  app.post("/api/inventory", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = insertInventorySchema.parse(req.body);
    const item = await storage.createInventory(data, userId);
    res.status(201).json(item);
  });

  app.patch("/api/inventory/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const data = insertInventorySchema.partial().parse(req.body);
    const item = await storage.updateInventory(id, userId, data);
    res.json(item);
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteInventory(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Notes
  app.get("/api/notes", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const notes = await storage.getNotes(userId);
    res.json(notes);
  });

  app.post("/api/notes", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = insertNoteSchema.parse(req.body);
    const note = await storage.createNote(data, userId);
    res.status(201).json(note);
  });

  app.patch("/api/notes/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const data = insertNoteSchema.partial().parse(req.body);
    const note = await storage.updateNote(id, userId, data);
    res.json(note);
  });

  app.delete("/api/notes/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteNote(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Travel
  app.get("/api/travel", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const logs = await storage.getTravelLogs(userId);
    res.json(logs);
  });

  app.post("/api/travel", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = insertTravelSchema.parse(req.body);
    const log = await storage.createTravelLog(data, userId);
    res.status(201).json(log);
  });

  app.delete("/api/travel/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteTravelLog(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Workers
  app.get("/api/workers", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const workers = await storage.getWorkers(userId);
    res.json(workers);
  });

  app.post("/api/workers", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    try {
      const data = insertWorkerSchema.parse(req.body);
      const worker = await storage.createWorker(data, userId);
      res.status(201).json(worker);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/workers/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    try {
      const id = parseInt(req.params.id);
      const data = insertWorkerSchema.partial().parse(req.body);
      const worker = await storage.updateWorker(id, userId, data);
      res.json(worker);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/workers/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteWorker(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Attendance
  app.get("/api/attendance", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const attendance = await storage.getAttendance(userId);
    res.json(attendance);
  });

  app.post("/api/attendance", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = insertAttendanceSchema.parse(req.body);
    const item = await storage.createAttendance(data, userId);
    
    // Automatically store attendance in logs
    const worker = await storage.getWorker(data.workerId!, userId);
    const job = data.jobId ? await storage.getJob(data.jobId, userId) : null;
    await storage.createNote({
      type: "log",
      section: "workers_attendance", // Specific section for attendance logs
      referenceId: data.workerId,
      attribute: "attendance",
      content: `Attendance recorded for ${worker?.name || 'Worker'} on ${data.date}: ${data.status.toUpperCase()}${job ? ` (Job: ${job.jobName || job.description})` : ''}`
    }, userId);

    res.status(201).json(item);
  });

  // Job Images (Gallery)
  app.get("/api/jobs/:id/images", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const jobId = parseInt(req.params.id);
    const images = await storage.getJobImages(userId, jobId);
    res.json(images);
  });

  app.post("/api/jobs/:id/images", upload.single("image"), async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const jobId = parseInt(req.params.id);
      const url = `/uploads/${req.file.filename}`;
      const image = await storage.createJobImage({ 
        jobId, 
        url, 
        description: req.body.description || null 
      }, userId);
      res.status(201).json(image);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/images/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteJobImage(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Worker Documents
  app.get("/api/workers/:id/documents", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const workerId = parseInt(req.params.id);
    const docs = await storage.getWorkerDocuments(userId, workerId);
    res.json(docs);
  });

  app.post("/api/workers/:id/documents", upload.single("image"), async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No document file provided" });
      }
      const workerId = parseInt(req.params.id);
      const url = `/uploads/${req.file.filename}`;
      const doc = await storage.createWorkerDocument({ 
        workerId, 
        url, 
        name: req.body.name || req.file.originalname 
      }, userId);
      res.status(201).json(doc);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/worker-documents/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteWorkerDocument(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  // Customer Images
  app.get("/api/customers/:id/images", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const customerId = parseInt(req.params.id);
    const images = await storage.getCustomerImages(userId, customerId);
    res.json(images);
  });

  app.post("/api/customers/:id/images", upload.single("image"), async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const customerId = parseInt(req.params.id);
      const url = `/uploads/${req.file.filename}`;
      const image = await storage.createCustomerImage({ 
        customerId, 
        url, 
        description: req.body.description || null 
      }, userId);
      res.status(201).json(image);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/customer-images/:id", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    await storage.deleteCustomerImage(parseInt(req.params.id), userId);
    res.status(204).end();
  });

  app.get("/api/backup", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const data = await storage.exportData(userId);
    res.json(data);
  });

  app.post("/api/restore", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    try {
      console.log("Restore request received for user:", userId);
      await storage.importData(userId, req.body);
      res.json({ message: "Data restored successfully" });
    } catch (err: any) {
      console.error("Restore failed:", err);
      res.status(400).json({ message: err.message || "Failed to restore data" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ response: "This is a dummy chat response." });
  });

  return httpServer;
}
