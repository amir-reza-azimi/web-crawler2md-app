import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { storage } from '../storage';
import type { CrawlJob, InsertCrawlResult } from '@shared/schema';

export class CrawlerService {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
  }

  async crawlWebsite(jobId: number): Promise<void> {
    const job = await storage.getCrawlJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await storage.updateCrawlJob(jobId, { status: 'running' });

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const discoveredUrls = await this.discoverUrls(browser, job);
      await storage.updateCrawlJob(jobId, { totalPages: discoveredUrls.length });

      const results: InsertCrawlResult[] = [];
      
      for (let i = 0; i < discoveredUrls.length; i++) {
        const url = discoveredUrls[i];
        
        try {
          await this.delay(job.requestDelay);
          const result = await this.extractContent(browser, url, job);
          results.push({
            jobId,
            url,
            title: result.title,
            content: result.content,
            markdownContent: result.markdownContent,
            fileSize: result.markdownContent?.length || 0,
            status: 'success',
            errorMessage: null,
          });

          await storage.createCrawlResult(results[results.length - 1]);
          await storage.updateCrawlJob(jobId, { processedPages: i + 1 });
        } catch (error) {
          const errorResult: InsertCrawlResult = {
            jobId,
            url,
            title: null,
            content: null,
            markdownContent: null,
            fileSize: 0,
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          };
          
          await storage.createCrawlResult(errorResult);
          await storage.updateCrawlJob(jobId, { processedPages: i + 1 });
        }
      }

      await browser.close();
      await storage.updateCrawlJob(jobId, { status: 'completed' });
    } catch (error) {
      await storage.updateCrawlJob(jobId, { 
        status: 'error',
        processedPages: 0,
      });
      throw error;
    }
  }

  private async discoverUrls(browser: any, job: CrawlJob): Promise<string[]> {
    const visited = new Set<string>();
    const toVisit = [job.baseUrl];
    const discovered = new Set<string>();
    let currentDepth = 0;

    const regexPatterns = job.regexPatterns.map(pattern => new RegExp(pattern));

    while (toVisit.length > 0 && currentDepth < job.maxDepth) {
      const currentBatch = toVisit.splice(0, job.maxConcurrent);
      
      const promises = currentBatch.map(async (url) => {
        if (visited.has(url)) return [];
        visited.add(url);

        try {
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
          
          const content = await page.content();
          const $ = cheerio.load(content);
          
          const links: string[] = [];
          $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
              const absoluteUrl = new URL(href, url).href;
              if (absoluteUrl.startsWith(job.baseUrl) && !visited.has(absoluteUrl)) {
                links.push(absoluteUrl);
              }
            }
          });

          await page.close();
          return links;
        } catch (error) {
          console.error(`Error discovering URLs from ${url}:`, error);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const newUrls = results.flat();
      
      newUrls.forEach(url => {
        if (!visited.has(url)) {
          toVisit.push(url);
          
          // Check if URL matches any regex pattern
          const matches = regexPatterns.some(pattern => pattern.test(url));
          if (matches) {
            discovered.add(url);
          }
        }
      });

      currentDepth++;
    }

    return Array.from(discovered);
  }

  private async extractContent(browser: any, url: string, job: CrawlJob): Promise<{
    title: string;
    content: string;
    markdownContent: string;
  }> {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const content = await page.content();
    const $ = cheerio.load(content);

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

    // Remove unwanted elements if configured
    if (job.removeNavigation) {
      $('nav, header, footer, .navigation, .nav, .menu, .sidebar').remove();
    }

    if (job.cleanFormatting) {
      $('script, style, noscript, iframe, object, embed').remove();
      $('.advertisement, .ads, .social-share, .comments').remove();
    }

    if (!job.includeImages) {
      $('img').remove();
    }

    // Extract main content (try to find article, main, or content area)
    let mainContent = $('article, main, .content, .post-content, .entry-content, .article-content').first();
    if (mainContent.length === 0) {
      mainContent = $('body');
    }

    const htmlContent = mainContent.html() || '';
    const markdownContent = this.turndownService.turndown(htmlContent);

    await page.close();

    return {
      title,
      content: htmlContent,
      markdownContent,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const crawlerService = new CrawlerService();
