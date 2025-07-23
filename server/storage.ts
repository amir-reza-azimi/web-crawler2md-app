import { users, crawlJobs, crawlResults, type User, type InsertUser, type CrawlJob, type InsertCrawlJob, type CrawlResult, type InsertCrawlResult } from "@shared/schema";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

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
  private readonly dataFile = join(process.cwd(), 'storage-data.json');

  constructor() {
    this.users = new Map();
    this.crawlJobs = new Map();
    this.crawlResults = new Map();
    this.currentUserId = 1;
    this.currentJobId = 1;
    this.currentResultId = 1;
    
    // Load persisted data on startup
    this.loadData();
  }

  private saveData(): void {
    try {
      const data = {
        users: Array.from(this.users.entries()),
        crawlJobs: Array.from(this.crawlJobs.entries()),
        crawlResults: Array.from(this.crawlResults.entries()),
        currentUserId: this.currentUserId,
        currentJobId: this.currentJobId,
        currentResultId: this.currentResultId,
      };
      writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }

  private loadData(): void {
    try {
      if (existsSync(this.dataFile)) {
        const data = JSON.parse(readFileSync(this.dataFile, 'utf8'));
        this.users = new Map(data.users || []);
        this.crawlJobs = new Map(data.crawlJobs?.map(([id, job]: [number, any]) => [
          id, 
          { ...job, createdAt: new Date(job.createdAt) }
        ]) || []);
        this.crawlResults = new Map(data.crawlResults?.map(([id, result]: [number, any]) => [
          id, 
          { ...result, createdAt: new Date(result.createdAt) }
        ]) || []);
        this.currentUserId = data.currentUserId || 1;
        this.currentJobId = data.currentJobId || 1;
        this.currentResultId = data.currentResultId || 1;
        console.log(`Loaded ${this.crawlJobs.size} jobs and ${this.crawlResults.size} results from storage`);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
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
    this.saveData();
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
    this.saveData();
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
    this.saveData();
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
    this.saveData();
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
