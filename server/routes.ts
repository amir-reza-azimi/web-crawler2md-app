import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { crawlerService } from "./services/crawler";
import { insertCrawlJobSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create crawl job
  app.post("/api/crawl-jobs", async (req, res) => {
    try {
      const validatedData = insertCrawlJobSchema.parse(req.body);
      const job = await storage.createCrawlJob(validatedData);
      
      // Start crawling in background
      crawlerService.crawlWebsite(job.id).catch(error => {
        console.error(`Crawling job ${job.id} failed:`, error);
      });
      
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create crawl job" });
      }
    }
  });

  // Get all crawl jobs
  app.get("/api/crawl-jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllCrawlJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch crawl jobs" });
    }
  });

  // Get specific crawl job
  app.get("/api/crawl-jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getCrawlJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch crawl job" });
    }
  });

  // Get crawl results for a job
  app.get("/api/crawl-jobs/:id/results", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const results = await storage.getCrawlResults(jobId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch crawl results" });
    }
  });

  // Download all results as zip file
  app.get("/api/crawl-jobs/:id/download", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const results = await storage.getCrawlResults(jobId);
      const job = await storage.getCrawlJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      res.attachment(`crawl-results-${jobId}.zip`);
      archive.pipe(res);

      results.forEach((result, index) => {
        if (result.markdownContent && result.status === 'success') {
          const fileName = `${index + 1}-${this.sanitizeFileName(result.title || result.url)}.md`;
          archive.append(result.markdownContent, { name: fileName });
        }
      });

      await archive.finalize();
    } catch (error) {
      res.status(500).json({ message: "Failed to generate download" });
    }
  });

  // Validate regex pattern
  app.post("/api/validate-regex", async (req, res) => {
    try {
      const { pattern } = req.body;
      if (!pattern) {
        return res.status(400).json({ message: "Pattern is required" });
      }

      try {
        new RegExp(pattern);
        res.json({ valid: true });
      } catch (error) {
        res.json({ valid: false, error: error instanceof Error ? error.message : 'Invalid regex' });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to validate regex" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
}
