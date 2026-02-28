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
  type CustomCategory,
  customers, jobs, expenses, inventory, notes, travel, workers, attendance, users, jobImages, workerDocuments, customerImages, customCategories
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

  // Custom Categories
  getCustomCategories(userId: number, type: string): Promise<CustomCategory[]>;
  createCustomCategory(userId: number, type: string, name: string): Promise<CustomCategory>;
  deleteCustomCategory(id: number, userId: number): Promise<void>;


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

    // Count only THIS user's jobs to get the correct job number
    const existingJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    const jobNumber = existingJobs.length + 1;

    const [job] = await db.insert(jobs).values({
      ...insertJob,
      userId,
      agreedAmount: insertJob.agreedAmount || insertJob.quotedAmount
    }).returning();

    // Formula: N (user's job count) + C (category initial) + D (DDMMYYYY)
    const jobId = `${jobNumber}${categoryInitial}${dateStr}`;
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

// Custom Categories
  async getCustomCategories(userId: number, type: string): Promise<CustomCategory[]> {
    return await db.select().from(customCategories).where(
      and(eq(customCategories.userId, userId), eq(customCategories.type, type))
    );
  }
  async createCustomCategory(userId: number, type: string, name: string): Promise<CustomCategory> {
    const [cat] = await db.insert(customCategories).values({ userId, type, name }).returning();
    return cat;
  }
  async deleteCustomCategory(id: number, userId: number): Promise<void> {
    await db.delete(customCategories).where(
      and(eq(customCategories.id, id), eq(customCategories.userId, userId))
    );
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
      workerDocuments: await db.select().from(workerDocuments).where(eq(workerDocuments.userId, userId)),
      customerImages: await db.select().from(customerImages).where(eq(customerImages.userId, userId)),
    };
  }

  async importData(userId: number, data: any): Promise<void> {
    console.log("Importing data for user:", userId, "- record counts:", {
      customers: data.customers?.length || 0,
      jobs: data.jobs?.length || 0,
      workers: data.workers?.length || 0,
      expenses: data.expenses?.length || 0,
      inventory: data.inventory?.length || 0,
      notes: data.notes?.length || 0,
      travel: data.travel?.length || 0,
      attendance: data.attendance?.length || 0,
      jobImages: data.jobImages?.length || 0,
    });

    await db.transaction(async (tx) => {

      // STEP 1: Delete all existing data (child tables first, then parents)
      await tx.delete(jobImages).where(eq(jobImages.userId, userId));
      await tx.delete(workerDocuments).where(eq(workerDocuments.userId, userId));
      await tx.delete(customerImages).where(eq(customerImages.userId, userId));
      await tx.delete(attendance).where(eq(attendance.userId, userId));
      await tx.delete(inventory).where(eq(inventory.userId, userId));
      await tx.delete(travel).where(eq(travel.userId, userId));
      await tx.delete(expenses).where(eq(expenses.userId, userId));
      await tx.delete(notes).where(eq(notes.userId, userId));
      await tx.delete(workers).where(eq(workers.userId, userId));
      await tx.delete(jobs).where(eq(jobs.userId, userId));
      await tx.delete(customers).where(eq(customers.userId, userId));

      // ID translation maps (old backup ID → new database ID)
      const customerIdMap = new Map<number, number>();
      const jobIdMap = new Map<number, number>();
      const workerIdMap = new Map<number, number>();

      // STEP 2: Insert customers one by one, record new IDs
      for (const c of (data.customers || [])) {
        const { id: oldId, userId: _u, ...rest } = c;
        const [inserted] = await tx.insert(customers).values({ ...rest, userId }).returning();
        if (oldId) customerIdMap.set(Number(oldId), inserted.id);
      }

      // STEP 3: Insert jobs one by one, record new IDs
      for (const j of (data.jobs || [])) {
        const { id: oldId, userId: _u, customerId, jobId: _jid, ...rest } = j;
        const newCustomerId = customerId ? customerIdMap.get(Number(customerId)) ?? null : null;
        const [inserted] = await tx.insert(jobs).values({
          ...rest,
          userId,
          customerId: newCustomerId,
        }).returning();
        if (oldId) jobIdMap.set(Number(oldId), inserted.id);
      }

      // STEP 4: Insert workers one by one, record new IDs
      for (const w of (data.workers || [])) {
        const { id: oldId, userId: _u, jobId, ...rest } = w;
        const newJobId = jobId ? jobIdMap.get(Number(jobId)) ?? null : null;
        const [inserted] = await tx.insert(workers).values({
          ...rest,
          userId,
          jobId: newJobId,
        }).returning();
        if (oldId) workerIdMap.set(Number(oldId), inserted.id);
      }

      // STEP 5: Expenses
      for (const e of (data.expenses || [])) {
        const { id, userId: _u, jobId, ...rest } = e;
        await tx.insert(expenses).values({
          ...rest,
          userId,
          jobId: jobId ? jobIdMap.get(Number(jobId)) ?? null : null,
        });
      }

      // STEP 6: Inventory
      for (const i of (data.inventory || [])) {
        const { id, userId: _u, jobId, assignedToJobId, ...rest } = i;
        await tx.insert(inventory).values({
          ...rest,
          userId,
          jobId: jobId ? jobIdMap.get(Number(jobId)) ?? null : null,
          assignedToJobId: assignedToJobId ? jobIdMap.get(Number(assignedToJobId)) ?? null : null,
        });
      }

      // STEP 7: Travel
      for (const t of (data.travel || [])) {
        const { id, userId: _u, jobId, ...rest } = t;
        await tx.insert(travel).values({
          ...rest,
          userId,
          jobId: jobId ? jobIdMap.get(Number(jobId)) ?? null : null,
        });
      }

      // STEP 8: Notes
      for (const n of (data.notes || [])) {
        const { id, userId: _u, referenceId, createdAt, ...rest } = n;
        let newReferenceId: number | null = null;
        if (referenceId) {
          const sec = rest.section;
          if (sec === 'jobs' || sec === 'workers_attendance') {
            newReferenceId = jobIdMap.get(Number(referenceId)) ?? null;
          } else if (sec === 'customers') {
            newReferenceId = customerIdMap.get(Number(referenceId)) ?? null;
          } else if (sec === 'workers') {
            newReferenceId = workerIdMap.get(Number(referenceId)) ?? null;
          }
        }
        await tx.insert(notes).values({ ...rest, userId, referenceId: newReferenceId });
      }

      // STEP 9: Attendance
      for (const a of (data.attendance || [])) {
        const { id, userId: _u, workerId, jobId, ...rest } = a;
        await tx.insert(attendance).values({
          ...rest,
          userId,
          workerId: workerId ? workerIdMap.get(Number(workerId)) ?? null : null,
          jobId: jobId ? jobIdMap.get(Number(jobId)) ?? null : null,
        });
      }

      // STEP 10: Job Images
      for (const ji of (data.jobImages || [])) {
        const { id, userId: _u, jobId, createdAt, ...rest } = ji;
        const newJobId = jobId ? jobIdMap.get(Number(jobId)) ?? null : null;
        if (newJobId) {
          await tx.insert(jobImages).values({ ...rest, userId, jobId: newJobId });
        }
      }

      // STEP 11: Worker Documents
      for (const wd of (data.workerDocuments || [])) {
        const { id, userId: _u, workerId, createdAt, ...rest } = wd;
        const newWorkerId = workerId ? workerIdMap.get(Number(workerId)) ?? null : null;
        if (newWorkerId) {
          await tx.insert(workerDocuments).values({ ...rest, userId, workerId: newWorkerId });
        }
      }

      // STEP 12: Customer Images
      for (const ci of (data.customerImages || [])) {
        const { id, userId: _u, customerId, createdAt, ...rest } = ci;
        const newCustomerId = customerId ? customerIdMap.get(Number(customerId)) ?? null : null;
        if (newCustomerId) {
          await tx.insert(customerImages).values({ ...rest, userId, customerId: newCustomerId });
        }
      }

      console.log("Restore complete. ID maps:", {
        customers: customerIdMap.size,
        jobs: jobIdMap.size,
        workers: workerIdMap.size,
      });
    });
  }
}
export const storage = new DatabaseStorage();
