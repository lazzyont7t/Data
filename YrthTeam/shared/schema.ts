import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const predictionResults = pgTable("prediction_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  system: varchar("system").notNull(), // 'mys' or 'mz'
  interval: varchar("interval").notNull(), // '30s' or '1min'
  issueNumber: text("issue_number").notNull(),
  predictedNumber: integer("predicted_number").notNull(),
  predictedSize: varchar("predicted_size").notNull(), // 'Small' or 'Big'
  actualNumber: integer("actual_number"),
  actualSize: varchar("actual_size"),
  isCorrect: boolean("is_correct"),
  computation: text("computation"),
  timestamp: timestamp("timestamp").defaultNow(),
  rawData: json("raw_data"),
  userId: varchar("user_id").references(() => users.id),
  resultCheckedAt: timestamp("result_checked_at"),
  winLossStatus: varchar("win_loss_status"), // 'win', 'loss', 'pending'
});

export const systemStatus = pgTable("system_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  system: varchar("system").notNull().unique(),
  status: varchar("status").notNull(), // 'active', 'standby', 'error'
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  isRunning: boolean("is_running").default(false),
  currentInterval: varchar("current_interval"),
  errorMessage: text("error_message"),
});

// User statistics table
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  system: varchar("system").notNull(), // 'mys' or 'mz'
  interval: varchar("interval").notNull(), // '30s' or '1min'
  totalPredictions: integer("total_predictions").default(0),
  correctPredictions: integer("correct_predictions").default(0),
  winRate: integer("win_rate").default(0), // percentage
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertPredictionResultSchema = createInsertSchema(predictionResults).omit({
  id: true,
  timestamp: true,
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type PredictionResult = typeof predictionResults.$inferSelect;
export type InsertPredictionResult = z.infer<typeof insertPredictionResultSchema>;
export type SystemStatus = typeof systemStatus.$inferSelect;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
export type UserStats = typeof userStats.$inferSelect;
