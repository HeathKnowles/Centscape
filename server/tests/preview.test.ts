import request from 'supertest';
import express from 'express';
import { createServer, Server } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { previewHandler } from '../src/preview.js';
import { isPrivateIp, normalizeUrl, extractMeta } from '../src/utils.js';

import rateLimit from 'express-rate-limit';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const fixturesPath = join(__dirname, 'fixtures');
const htmlWithOpenGraph = readFileSync(join(fixturesPath, 'opengraph.html'), 'utf8');
const htmlWithoutMeta = readFileSync(join(fixturesPath, 'fallback.html'), 'utf8');
const hugeHtml = readFileSync(join(fixturesPath, 'huge.html'), 'utf8');

describe('Preview Handler', () => {
  let app: express.Application;
  let mockServer: Server;
  let mockServerPort: number;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests' });
      },
    });

    app.use('/preview', limiter);
    app.post('/preview', previewHandler);
  });

  afterEach(async () => {
    if (mockServer) {
      await new Promise((resolve) => mockServer.close(resolve));
    }
  });

  describe('✅ Metadata parsing', () => {
    it('should extract OpenGraph metadata correctly', async () => {
      const response = await request(app)
        .post('/preview')
        .send({ raw_html: htmlWithOpenGraph })
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'OpenGraph Title',
        image: 'https://example.com/og-image.jpg',
        siteName: 'Example Site',
        price: '29.99',
        currency: 'USD',
      });
    });
  });

  describe('✅ Fallback parsing', () => {
    it('should use fallbacks when meta tags are missing', async () => {
      const response = await request(app)
        .post('/preview')
        .send({ raw_html: htmlWithoutMeta })
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'Fallback Title Only',
        image: 'https://example.com/fallback-image.jpg',
        price: '19.99',
      });
    });
  });

  describe('✅ Timeout handling', () => {
    it(
      'should timeout after 5 seconds',
      async () => {
        mockServer = createServer((req, res) => {
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><head><title>Delayed Response</title></head></html>');
          }, 6000);
        });

        await new Promise<void>((resolve) => {
          mockServer.listen(0, () => {
            mockServerPort = (mockServer.address() as any).port;
            resolve();
          });
        });

        const response = await request(app)
          .post('/preview')
          .send({ url: `http://localhost:${mockServerPort}` })
          .expect(400);

        expect(response.body.error).toContain('Failed to fetch URL');
      },
      10000 // increase test timeout
    );
  });

  describe('✅ Redirect cap', () => {
    it('should fail on excessive redirects', async () => {
      let redirectCount = 0;

      mockServer = createServer((req, res) => {
        redirectCount++;
        if (redirectCount <= 5) {
          res.writeHead(302, {
            Location: `http://localhost:${mockServerPort}/redirect${redirectCount}`,
          });
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><head><title>Final Page</title></head></html>');
        }
      });

      await new Promise<void>((resolve) => {
        mockServer.listen(0, () => {
          mockServerPort = (mockServer.address() as any).port;
          resolve();
        });
      });

      const response = await request(app)
        .post('/preview')
        .send({ url: `http://localhost:${mockServerPort}` })
        .expect(400);

      expect(response.body.error).toContain('Failed to fetch URL');
    });
  });

  describe('✅ Size cap', () => {
    it('should reject content larger than 512KB', async () => {
      mockServer = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(hugeHtml);
      });

      await new Promise<void>((resolve) => {
        mockServer.listen(0, () => {
          mockServerPort = (mockServer.address() as any).port;
          resolve();
        });
      });

      const response = await request(app)
        .post('/preview')
        .send({ url: `http://localhost:${mockServerPort}` })
        .expect(400);

      expect(response.body.error).toBe('Content size exceeds 512KB limit');
    });
  });

  describe('✅ SSRF guard', () => {
    it('should block loopback IP addresses', async () => {
      const response = await request(app)
        .post('/preview')
        .send({ url: 'http://127.0.0.1:3000' })
        .expect(400);

      expect(response.body.error).toContain('Private IP addresses are not allowed');
    });

    it('should block private IP ranges', async () => {
      const privateIPs = ['http://10.0.0.1', 'http://192.168.1.1', 'http://172.16.0.1'];

      for (const privateIP of privateIPs) {
        const response = await request(app)
          .post('/preview')
          .send({ url: privateIP })
          .expect(400);

        expect(response.body.error).toContain('Private IP addresses are not allowed');
      }
    });
  });

  describe('✅ Rate limit', () => {
    it(
      'should enforce 10 requests per minute limit',
      async () => {
        for (let i = 0; i < 10; i++) {
          await request(app).post('/preview').send({ raw_html: htmlWithOpenGraph }).expect(200);
        }

        const response = await request(app)
          .post('/preview')
          .send({ raw_html: htmlWithOpenGraph })
          .expect(429);

        expect(response.body.error).toContain('Too many requests');
      },
      15000
    );
  });

  describe('Input validation', () => {
    it('should require url or raw_html', async () => {
      const response = await request(app).post('/preview').send({}).expect(400);
      expect(response.body.error).toBe('Either "url" or "raw_html" must be provided');
    });

    it('should reject invalid URLs', async () => {
      const response = await request(app).post('/preview').send({ url: 'not-a-valid-url' }).expect(400);
      expect(response.body.error).toContain('Failed to fetch URL');
    });

    it('should reject non-HTTP protocols', async () => {
      const response = await request(app).post('/preview').send({ url: 'ftp://example.com' }).expect(400);
      expect(response.body.error).toBe('Only HTTP and HTTPS protocols are allowed');
    });
  });

  describe('Content type validation', () => {
    it('should reject non-HTML content', async () => {
      mockServer = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"message": "This is JSON, not HTML"}');
      });

      await new Promise<void>((resolve) => {
        mockServer.listen(0, () => {
          mockServerPort = (mockServer.address() as any).port;
          resolve();
        });
      });

      const response = await request(app)
        .post('/preview')
        .send({ url: `http://localhost:${mockServerPort}` })
        .expect(400);

      expect(response.body.error).toBe('URL must return HTML content');
    });
  });

  describe('Utils functions', () => {
    describe('normalizeUrl', () => {
      it('should remove UTM parameters', () => {
        const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&param=keep';
        expect(normalizeUrl(url)).toBe('https://example.com/page?param=keep');
      });

      it('should lowercase hostname and remove fragments', () => {
        const url = 'https://EXAMPLE.COM/Page#section';
        expect(normalizeUrl(url)).toBe('https://example.com/Page');
      });
    });

    describe('extractMeta', () => {
      it('should extract meta content from different attribute types', () => {
        const html = `
          <meta name="description" content="Name attribute" />
          <meta property="og:description" content="Property attribute" />
        `;
        const $ = cheerio.load(html);

        expect(extractMeta($, ['description'])).toBe('Name attribute');
        expect(extractMeta($, ['og:description'])).toBe('Property attribute');
      });

      it('should return null when no meta tags found', () => {
        const $ = cheerio.load('<html></html>');
        expect(extractMeta($, ['nonexistent'])).toBeNull();
      });
    });

    describe('isPrivateIp', () => {
      it('should identify loopback addresses', async () => {
        expect(await isPrivateIp('127.0.0.1')).toBe(true);
        expect(await isPrivateIp('127.1.1.1')).toBe(true);
      });

      it('should identify private IP ranges', async () => {
        expect(await isPrivateIp('10.0.0.1')).toBe(true);
        expect(await isPrivateIp('192.168.1.1')).toBe(true);
        expect(await isPrivateIp('172.16.0.1')).toBe(true);
      });

      it('should allow public IPs', async () => {
        expect(await isPrivateIp('8.8.8.8')).toBe(false);
        expect(await isPrivateIp('1.1.1.1')).toBe(false);
      });
    });
  });
});
