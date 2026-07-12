import { pgTable, text, integer, timestamp, numeric, jsonb, serial } from "drizzle-orm/pg-core";

// Level 3: Database Master
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  price: integer("price").notNull(),
  lastPrice: integer("last_price"),
  trend: text("trend").default("stable"),
  stock: numeric("stock").default("0"),
  icon: text("icon").default("package"),
  vendor: text("vendor"),
});

export const workers = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: text("level").notNull(),
  rate: integer("rate").notNull(),
  contact: text("contact"),
  rating: integer("rating").default(5),
});

// Level 2: Project Management
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  client: text("client").notNull(),
  type: text("type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  contractValue: integer("contract_value").notNull(),
  saldo: integer("saldo").default(0),
  status: text("status").default("ok"),
  progressPlan: integer("progress_plan").default(0),
  progressActual: integer("progress_actual").default(0),
  rapData: jsonb("rap_data"), 
  timelineData: jsonb("timeline_data"),
  metadata: jsonb("metadata"),
});

// Level 1: Bisnis & Finansial
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  type: text("type").notNull(), // 'in' or 'out'
  category: text("category").notNull(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow(),
  icon: text("icon").default("arrow-right-circle"),
  note: text("note"),
});

export const businessAccounts = pgTable("business_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  balance: integer("balance").notNull(),
  icon: text("icon").default("landmark"),
});
