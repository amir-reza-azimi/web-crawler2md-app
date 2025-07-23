import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const crawlJobs = pgTable("crawl_jobs", {
  id: serial("id").primaryKey(),
  baseUrl: text("base_url").notNull(),
  regexPatterns: text("regex_patterns").array().notNull(),
  maxDepth: integer("max_depth").notNull().default(2),
  requestDelay: integer("request_delay").notNull().default(1000),
  maxConcurrent: integer("max_concurrent").notNull().default(2),
  removeNavigation: boolean("remove_navigation").notNull().default(true),
  cleanFormatting: boolean("clean_formatting").notNull().default(true),
  includeImages: boolean("include_images").notNull().default(false),
  status: text("status", { enum: ["pending", "running", "completed", "error"] }).notNull().default("pending"),
  totalPages: integer("total_pages").notNull().default(0),
  processedPages: integer("processed_pages").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const crawlResults = pgTable("crawl_results", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  content: text("content"),
  markdownContent: text("markdown_content"),
  fileSize: integer("file_size"),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCrawlJobSchema = createInsertSchema(crawlJobs).omit({
  id: true,
  status: true,
  totalPages: true,
  processedPages: true,
  createdAt: true,
});

export const insertCrawlResultSchema = createInsertSchema(crawlResults).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCrawlJob = z.infer<typeof insertCrawlJobSchema>;
export type CrawlJob = typeof crawlJobs.$inferSelect;
export type InsertCrawlResult = z.infer<typeof insertCrawlResultSchema>;
export type CrawlResult = typeof crawlResults.$inferSelect;
