import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { crawlerService } from "./services/crawler";
import { insertCrawlJobSchema } from "@shared/schema";
import { z } from "zod";
import archiver from "archiver";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create crawl job
  app.post("/api/crawl-jobs", async (req, res) => {
    try {
      const validatedData = insertCrawlJobSchema.parse(req.body);
      const job = await storage.createCrawlJob(validatedData);
      
      // Start crawling in background
      crawlerService.crawlWebsite(job.id).catch(error => {
        console.error(`Crawling job ${job.id} failed:`, error);
        console.error('Error details:', error.stack);
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
      
      console.log(`Download request for job ${jobId}, found ${results.length} results`);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const archive = archiver('zip', { zlib: { level: 9 } });
      
      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        throw err;
      });
      
      res.attachment(`crawl-results-${jobId}.zip`);
      archive.pipe(res);

      let fileCount = 0;
      results.forEach((result, index) => {
        if (result.markdownContent && result.status === 'success') {
          const fileName = `${index + 1}-${sanitizeFileName(result.title || result.url)}.md`;
          console.log(`Adding file ${fileName} with ${result.markdownContent.length} characters`);
          archive.append(result.markdownContent, { name: fileName });
          fileCount++;
        }
      });

      console.log(`Added ${fileCount} files to archive`);
      await archive.finalize();
      console.log('Archive finalized successfully');
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ message: "Failed to generate download", error: error.message });
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
