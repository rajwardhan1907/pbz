import { 
  type Customer, type InsertCustomer,
  type Job, type InsertJob,
  type Expense, type InsertExpense,
  type InventoryItem, type InsertInventory,
  type Note, type InsertNote,
  type TravelLog, type InsertTravel,
  type Worker, type InsertWorker,
  type Attendance, type InsertAttendance,
  type User, type InsertUser,
  type JobImage, type InsertJobImage,
  type WorkerDocument, type InsertWorkerDocument,
  type CustomerImage, type InsertCustomerImage,
  customers, jobs, expenses, inventory, notes, travel, workers, attendance, users, jobImages, workerDocuments, customerImages
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Customers
  getCustomers(userId: number): Promise<Customer[]>;
  getCustomer(id: number, userId: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer, userId: number): Promise<Customer>;
  updateCustomer(id: number, userId: number, updates: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number, userId: number): Promise<void>;

  // Jobs
  getJobs(userId: number): Promise<Job[]>;
  getJob(id: number, userId: number): Promise<Job | undefined>;
  createJob(job: InsertJob, userId: number): Promise<Job>;
  updateJob(id: number, userId: number, job: Partial<InsertJob>): Promise<Job>;
  deleteJob(id: number, userId: number): Promise<void>;

  // Expenses
  getExpenses(userId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense, userId: number): Promise<Expense>;
  updateExpense(id: number, userId: number, updates: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number, userId: number): Promise<void>;

  // Inventory
  getInventory(userId: number): Promise<InventoryItem[]>;
  createInventory(item: InsertInventory, userId: number): Promise<InventoryItem>;
  updateInventory(id: number, userId: number, item: Partial<InsertInventory>): Promise<InventoryItem>;
  deleteInventory(id: number, userId: number): Promise<void>;

  // Notes
  getNotes(userId: number): Promise<Note[]>;
  createNote(note: InsertNote, userId: number): Promise<Note>;
  deleteNote(id: number, userId: number): Promise<void>;
  updateNote(id: number, userId: number, updates: Partial<InsertNote>): Promise<Note>;

  // Travel
  getTravelLogs(userId: number): Promise<TravelLog[]>;
  createTravelLog(log: InsertTravel, userId: number): Promise<TravelLog>;
  deleteTravelLog(id: number, userId: number): Promise<void>;

  // Workers
  getWorkers(userId: number): Promise<Worker[]>;
  getWorker(id: number, userId: number): Promise<Worker | undefined>;
  createWorker(worker: InsertWorker, userId: number): Promise<Worker>;
  updateWorker(id: number, userId: number, worker: Partial<InsertWorker>): Promise<Worker>;
  deleteWorker(id: number, userId: number): Promise<void>;

  // Attendance
  getAttendance(userId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance, userId: number): Promise<Attendance>;

  // Job Images (Gallery)
  getJobImages(userId: number, jobId?: number): Promise<JobImage[]>;
  createJobImage(image: InsertJobImage, userId: number): Promise<JobImage>;
  deleteJobImage(id: number, userId: number): Promise<void>;

  // Worker Documents
  getWorkerDocuments(userId: number, workerId: number): Promise<WorkerDocument[]>;
  createWorkerDocument(doc: InsertWorkerDocument, userId: number): Promise<WorkerDocument>;
  deleteWorkerDocument(id: number, userId: number): Promise<void>;

  // Customer Images
  getCustomerImages(userId: number, customerId: number): Promise<CustomerImage[]>;
  createCustomerImage(image: InsertCustomerImage, userId: number): Promise<CustomerImage>;
  deleteCustomerImage(id: number, userId: number): Promise<void>;

  // Backup & Restore
  exportData(userId: number): Promise<any>;
  importData(userId: number, data: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Customers
  async getCustomers(userId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.userId, userId));
  }
  async getCustomer(id: number, userId: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return customer;
  }
  async createCustomer(insertCustomer: InsertCustomer, userId: number): Promise<Customer> {
    const [customer] = await db.insert(customers).values({ ...insertCustomer, userId }).returning();
    return customer;
  }
  async updateCustomer(id: number, userId: number, updates: Partial<InsertCustomer>): Promise<Customer> {
    const [updated] = await db.update(customers)
      .set(updates)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    if (!updated) throw new Error("Customer not found");
    return updated;
  }
  async deleteCustomer(id: number, userId: number): Promise<void> {
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.userId, userId)));
  }

  // Jobs
  async getJobs(userId: number): Promise<Job[]> {
    return await db.select().from(jobs).where(eq(jobs.userId, userId));
  }
  async getJob(id: number, userId: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
    return job;
  }
  async createJob(insertJob: InsertJob, userId: number): Promise<Job> {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}${month}${year}`;
    const categoryInitial = (insertJob.category?.[0] || 'X').toUpperCase();
    
    const [job] = await db.insert(jobs).values({
      ...insertJob,
      userId,
      agreedAmount: insertJob.agreedAmount || insertJob.quotedAmount
    }).returning();

    const jobId = `#${job.id}${categoryInitial}${dateStr}`;
    const [updatedJob] = await db.update(jobs)
      .set({ jobId })
      .where(eq(jobs.id, job.id))
      .returning();

    return updatedJob;
  }
  async updateJob(id: number, userId: number, updates: Partial<InsertJob>): Promise<Job> {
    const [updated] = await db.update(jobs)
      .set(updates)
      .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
      .returning();
    if (!updated) throw new Error("Job not found");
    return updated;
  }
  async deleteJob(id: number, userId: number): Promise<void> {
    await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
  }

  // Expenses
  async getExpenses(userId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.userId, userId));
  }
  async createExpense(insertExpense: InsertExpense, userId: number): Promise<Expense> {
    const [expense] = await db.insert(expenses).values({ ...insertExpense, userId }).returning();
    return expense;
  }
  async updateExpense(id: number, userId: number, updates: Partial<InsertExpense>): Promise<Expense> {
    const [updated] = await db.update(expenses)
      .set(updates)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    if (!updated) throw new Error("Expense not found");
    return updated;
  }
  async deleteExpense(id: number, userId: number): Promise<void> {
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  }

  // Inventory
  async getInventory(userId: number): Promise<InventoryItem[]> {
    return await db.select().from(inventory).where(eq(inventory.userId, userId));
  }
  async createInventory(insertItem: InsertInventory, userId: number): Promise<InventoryItem> {
    const [item] = await db.insert(inventory).values({ ...insertItem, userId }).returning();
    
    if (item) {
      const target = item.assignedToJobId ? `Job #${item.assignedToJobId}` : "General Inventory";
      await this.createNote({
        type: "log",
        section: "inventory",
        referenceId: item.id,
        attribute: "reassignment",
        content: `Initial assignment of ${item.name} (${item.quantity} ${item.unit}) to ${target}`
      }, userId);
    }
    return item;
  }
  async updateInventory(id: number, userId: number, updates: Partial<InsertInventory>): Promise<InventoryItem> {
    const [existing] = await db.select().from(inventory).where(and(eq(inventory.id, id), eq(inventory.userId, userId)));
    if (!existing) throw new Error("Inventory item not found");

    if ((updates.assignedToJobId !== undefined && updates.assignedToJobId !== existing.assignedToJobId) || 
        (updates.quantity !== undefined && updates.quantity !== existing.quantity)) {
      
      let logContent = `Inventory item "${existing.name}" updated: `;
      if (updates.assignedToJobId !== undefined && updates.assignedToJobId !== existing.assignedToJobId) {
        const from = existing.assignedToJobId ? `Job #${existing.assignedToJobId}` : "General Inventory";
        const to = updates.assignedToJobId ? `Job #${updates.assignedToJobId}` : "General Inventory";
        logContent += `Reassigned from ${from} to ${to}. `;
      }
      if (updates.quantity !== undefined && updates.quantity !== existing.quantity) {
        logContent += `Quantity changed from ${existing.quantity} to ${updates.quantity}. `;
      }

      await this.createNote({
        type: "log",
        section: "inventory",
        referenceId: id,
        attribute: "reassignment",
        content: logContent.trim()
      }, userId);
    }

    const [updated] = await db.update(inventory)
      .set(updates)
      .where(and(eq(inventory.id, id), eq(inventory.userId, userId)))
      .returning();
    return updated;
  }
  async deleteInventory(id: number, userId: number): Promise<void> {
    await db.delete(inventory).where(and(eq(inventory.id, id), eq(inventory.userId, userId)));
  }

  // Notes
  async getNotes(userId: number): Promise<Note[]> {
    return await db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.createdAt));
  }
  async createNote(insertNote: InsertNote, userId: number): Promise<Note> {
    const [note] = await db.insert(notes).values({ ...insertNote, userId }).returning();
    return note;
  }
  async deleteNote(id: number, userId: number): Promise<void> {
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  }
  async updateNote(id: number, userId: number, updates: Partial<InsertNote>): Promise<Note> {
    const [updated] = await db.update(notes)
      .set(updates)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    if (!updated) throw new Error("Note not found");
    return updated;
  }

  // Travel
  async getTravelLogs(userId: number): Promise<TravelLog[]> {
    return await db.select().from(travel).where(eq(travel.userId, userId));
  }
  async createTravelLog(insertLog: InsertTravel, userId: number): Promise<TravelLog> {
    const [log] = await db.insert(travel).values({ ...insertLog, userId }).returning();
    return log;
  }
  async deleteTravelLog(id: number, userId: number): Promise<void> {
    await db.delete(travel).where(and(eq(travel.id, id), eq(travel.userId, userId)));
  }

  // Workers
  async getWorkers(userId: number): Promise<Worker[]> {
    return await db.select().from(workers).where(eq(workers.userId, userId));
  }
  async getWorker(id: number, userId: number): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(and(eq(workers.id, id), eq(workers.userId, userId)));
    return worker;
  }
  async createWorker(insertWorker: InsertWorker, userId: number): Promise<Worker> {
    const [existing] = await db.select().from(workers).where(and(eq(workers.name, insertWorker.name), eq(workers.userId, userId)));
    if (existing) throw new Error("Worker name already exists");

    const [worker] = await db.insert(workers).values({
      ...insertWorker,
      userId,
      rating: insertWorker.rating ?? 0
    }).returning();
    return worker;
  }
  async updateWorker(id: number, userId: number, updates: Partial<InsertWorker>): Promise<Worker> {
    if (updates.name) {
      const [existing] = await db.select().from(workers).where(and(eq(workers.name, updates.name), eq(workers.userId, userId)));
      if (existing && existing.id !== id) throw new Error("Worker name already exists");
    }
    const [updated] = await db.update(workers)
      .set(updates)
      .where(and(eq(workers.id, id), eq(workers.userId, userId)))
      .returning();
    if (!updated) throw new Error("Worker not found");
    return updated;
  }
  async deleteWorker(id: number, userId: number): Promise<void> {
    await db.delete(workers).where(and(eq(workers.id, id), eq(workers.userId, userId)));
  }

  // Attendance
  async getAttendance(userId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.userId, userId));
  }
  async createAttendance(insertAttendance: InsertAttendance, userId: number): Promise<Attendance> {
    const [item] = await db.insert(attendance).values({ ...insertAttendance, userId }).returning();
    return item;
  }

  // Job Images
  async getJobImages(userId: number, jobId?: number): Promise<JobImage[]> {
    if (jobId) {
      return await db.select().from(jobImages).where(and(eq(jobImages.userId, userId), eq(jobImages.jobId, jobId)));
    }
    return await db.select().from(jobImages).where(eq(jobImages.userId, userId));
  }
  async createJobImage(insertImage: InsertJobImage, userId: number): Promise<JobImage> {
    const [image] = await db.insert(jobImages).values({ ...insertImage, userId }).returning();
    return image;
  }
  async deleteJobImage(id: number, userId: number): Promise<void> {
    await db.delete(jobImages).where(and(eq(jobImages.id, id), eq(jobImages.userId, userId)));
  }

  // Worker Documents
  async getWorkerDocuments(userId: number, workerId: number): Promise<WorkerDocument[]> {
    return await db.select().from(workerDocuments).where(and(eq(workerDocuments.userId, userId), eq(workerDocuments.workerId, workerId)));
  }
  async createWorkerDocument(doc: InsertWorkerDocument, userId: number): Promise<WorkerDocument> {
    const [document] = await db.insert(workerDocuments).values({ ...doc, userId }).returning();
    return document;
  }
  async deleteWorkerDocument(id: number, userId: number): Promise<void> {
    await db.delete(workerDocuments).where(and(eq(workerDocuments.id, id), eq(workerDocuments.userId, userId)));
  }

  // Customer Images
  async getCustomerImages(userId: number, customerId: number): Promise<CustomerImage[]> {
    return await db.select().from(customerImages).where(and(eq(customerImages.userId, userId), eq(customerImages.customerId, customerId)));
  }
  async createCustomerImage(image: InsertCustomerImage, userId: number): Promise<CustomerImage> {
    const [customerImage] = await db.insert(customerImages).values({ ...image, userId }).returning();
    return customerImage;
  }
  async deleteCustomerImage(id: number, userId: number): Promise<void> {
    await db.delete(customerImages).where(and(eq(customerImages.id, id), eq(customerImages.userId, userId)));
  }

  // Backup & Restore
  async exportData(userId: number): Promise<any> {
    return {
      customers: await db.select().from(customers).where(eq(customers.userId, userId)),
      jobs: await db.select().from(jobs).where(eq(jobs.userId, userId)),
      expenses: await db.select().from(expenses).where(eq(expenses.userId, userId)),
      inventory: await db.select().from(inventory).where(eq(inventory.userId, userId)),
      notes: await db.select().from(notes).where(eq(notes.userId, userId)),
      travel: await db.select().from(travel).where(eq(travel.userId, userId)),
      workers: await db.select().from(workers).where(eq(workers.userId, userId)),
      attendance: await db.select().from(attendance).where(eq(attendance.userId, userId)),
      jobImages: await db.select().from(jobImages).where(eq(jobImages.userId, userId)),
    };
  }

  async importData(userId: number, data: any): Promise<void> {
    console.log("Importing data for user...", userId);
    
    await db.transaction(async (tx) => {
      // 1. Delete existing data for this user in correct dependency order
      await tx.delete(jobImages).where(eq(jobImages.userId, userId));
      await tx.delete(attendance).where(eq(attendance.userId, userId));
      await tx.delete(inventory).where(eq(inventory.userId, userId));
      await tx.delete(travel).where(eq(travel.userId, userId));
      await tx.delete(expenses).where(eq(expenses.userId, userId));
      await tx.delete(notes).where(eq(notes.userId, userId));
      await tx.delete(workers).where(eq(workers.userId, userId));
      await tx.delete(jobs).where(eq(jobs.userId, userId));
      await tx.delete(customers).where(eq(customers.userId, userId));

      // 2. Insert new data in correct dependency order (Primary tables first)
      if (data.customers?.length) {
        await tx.insert(customers).values(data.customers.map((c: any) => {
          const { id, ...rest } = c;
          return { ...rest, userId };
        }));
      }
      if (data.jobs?.length) {
        await tx.insert(jobs).values(data.jobs.map((j: any) => {
          const { id, ...rest } = j;
          return { ...rest, userId };
        }));
      }
      if (data.workers?.length) {
        await tx.insert(workers).values(data.workers.map((w: any) => {
          const { id, ...rest } = w;
          return { ...rest, userId };
        }));
      }
      if (data.expenses?.length) {
        await tx.insert(expenses).values(data.expenses.map((e: any) => {
          const { id, ...rest } = e;
          return { ...rest, userId };
        }));
      }
      if (data.inventory?.length) {
        await tx.insert(inventory).values(data.inventory.map((i: any) => {
          const { id, ...rest } = i;
          return { ...rest, userId };
        }));
      }
      if (data.notes?.length) {
        await tx.insert(notes).values(data.notes.map((n: any) => {
          const { id, ...rest } = n;
          return { ...rest, userId };
        }));
      }
      if (data.travel?.length) {
        await tx.insert(travel).values(data.travel.map((t: any) => {
          const { id, ...rest } = t;
          return { ...rest, userId };
        }));
      }
      if (data.attendance?.length) {
        await tx.insert(attendance).values(data.attendance.map((a: any) => {
          const { id, ...rest } = a;
          return { ...rest, userId };
        }));
      }
      if (data.jobImages?.length) {
        await tx.insert(jobImages).values(data.jobImages.map((ji: any) => {
          const { id, ...rest } = ji;
          return { ...rest, userId };
        }));
      }
    });
  }
}

export const storage = new DatabaseStorage();
