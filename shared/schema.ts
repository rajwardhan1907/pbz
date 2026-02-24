import { pgTable, text, serial, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jobId: text("job_id"), // New computed Job ID
  jobName: text("job_name"), // User-given name for the job
  customerId: integer("customer_id").references(() => customers.id),
  category: text("category").notNull().default("Interior painting"),
  description: text("description").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("quoted"),
  quotedAmount: numeric("quoted_amount").notNull(),
  agreedAmount: numeric("agreed_amount").notNull().default("0"),
  paidAmount: numeric("paid_amount").notNull().default("0"),
  startDate: text("start_date"),
  endDate: text("end_date"),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  paidAmount: numeric("paid_amount").notNull().default("0"),
  paidFull: boolean("paid_full").notNull().default(false),
  date: text("date").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  costPerUnit: numeric("cost_per_unit").notNull(),
  assignedToJobId: integer("assigned_to_job_id").references(() => jobs.id),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull().default("note"), // "note" for user notes, "log" for system/custom logs
  section: text("section").notNull(), // customers, expenses, inventory, workers, travel, job
  referenceId: integer("reference_id"), // ID of the specific entity in that section
  attribute: text("attribute"), // Specific attribute if any (e.g., "address", "quotedAmount")
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const travel = pgTable("travel", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  date: text("date").notNull(),
  kilometers: numeric("kilometers").notNull(),
  fuelCost: numeric("fuel_cost").notNull(),
});

export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  address: text("address"),
  documentUrl: text("document_url"),
  dailyWage: numeric("daily_wage").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  rating: integer("rating").default(0),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  workerId: integer("worker_id").references(() => workers.id),
  jobId: integer("job_id").references(() => jobs.id),
  date: text("date").notNull(),
  status: text("status").notNull(),
  extraAllowance: numeric("extra_allowance").default("0"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const jobImages = pgTable("job_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workerDocuments = pgTable("worker_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  workerId: integer("worker_id").references(() => workers.id).notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerImages = pgTable("customer_images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, userId: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, userId: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, userId: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, userId: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, userId: true, createdAt: true });
export const insertTravelSchema = createInsertSchema(travel).omit({ id: true, userId: true });
export const insertWorkerSchema = createInsertSchema(workers).omit({ id: true, userId: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, userId: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertJobImageSchema = createInsertSchema(jobImages).omit({ id: true, userId: true, createdAt: true });
export const insertWorkerDocumentSchema = createInsertSchema(workerDocuments).omit({ id: true, userId: true, createdAt: true });
export const insertCustomerImageSchema = createInsertSchema(customerImages).omit({ id: true, userId: true, createdAt: true });

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertInventoryItem = InsertInventory;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type TravelLog = typeof travel.$inferSelect;
export type InsertTravel = z.infer<typeof insertTravelSchema>;
export type InsertTravelExpense = InsertTravel;

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = z.infer<typeof insertWorkerSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type JobImage = typeof jobImages.$inferSelect;
export type InsertJobImage = z.infer<typeof insertJobImageSchema>;

export type WorkerDocument = typeof workerDocuments.$inferSelect;
export type InsertWorkerDocument = z.infer<typeof insertWorkerDocumentSchema>;

export type CustomerImage = typeof customerImages.$inferSelect;
export type InsertCustomerImage = z.infer<typeof insertCustomerImageSchema>;
