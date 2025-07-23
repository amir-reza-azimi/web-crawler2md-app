import { users, crawlJobs, crawlResults, type User, type InsertUser, type CrawlJob, type InsertCrawlJob, type CrawlResult, type InsertCrawlResult } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createCrawlJob(job: InsertCrawlJob): Promise<CrawlJob>;
  getCrawlJob(id: number): Promise<CrawlJob | undefined>;
  getAllCrawlJobs(): Promise<CrawlJob[]>;
  updateCrawlJob(id: number, updates: Partial<CrawlJob>): Promise<CrawlJob | undefined>;
  
  createCrawlResult(result: InsertCrawlResult): Promise<CrawlResult>;
  getCrawlResults(jobId: number): Promise<CrawlResult[]>;
  getCrawlResult(id: number): Promise<CrawlResult | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private crawlJobs: Map<number, CrawlJob>;
  private crawlResults: Map<number, CrawlResult>;
  private currentUserId: number;
  private currentJobId: number;
  private currentResultId: number;

  constructor() {
    this.users = new Map();
    this.crawlJobs = new Map();
    this.crawlResults = new Map();
    this.currentUserId = 1;
    this.currentJobId = 1;
    this.currentResultId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createCrawlJob(insertJob: InsertCrawlJob): Promise<CrawlJob> {
    const id = this.currentJobId++;
    const job: CrawlJob = {
      ...insertJob,
      id,
      status: "pending",
      totalPages: 0,
      processedPages: 0,
      createdAt: new Date(),
    };
    this.crawlJobs.set(id, job);
    return job;
  }

  async getCrawlJob(id: number): Promise<CrawlJob | undefined> {
    return this.crawlJobs.get(id);
  }

  async getAllCrawlJobs(): Promise<CrawlJob[]> {
    return Array.from(this.crawlJobs.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async updateCrawlJob(id: number, updates: Partial<CrawlJob>): Promise<CrawlJob | undefined> {
    const job = this.crawlJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    this.crawlJobs.set(id, updatedJob);
    return updatedJob;
  }

  async createCrawlResult(insertResult: InsertCrawlResult): Promise<CrawlResult> {
    const id = this.currentResultId++;
    const result: CrawlResult = {
      ...insertResult,
      id,
      createdAt: new Date(),
    };
    this.crawlResults.set(id, result);
    return result;
  }

  async getCrawlResults(jobId: number): Promise<CrawlResult[]> {
    return Array.from(this.crawlResults.values())
      .filter(result => result.jobId === jobId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCrawlResult(id: number): Promise<CrawlResult | undefined> {
    return this.crawlResults.get(id);
  }
}

export const storage = new MemStorage();
