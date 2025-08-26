import type { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { isIP } from 'net';

interface PreviewRequest {
  url?: string;
  raw_html?: string;
}

interface PreviewResponse {
  title?: string;
  image?: string;
  price?: string;
  currency?: string;
  siteName?: string;
  sourceUrl?: string;
}

function isPrivateIP(ip: string): boolean {
  if (!isIP(ip)) return false;
  const parts = ip.split('.').map(Number);

  if (parts.length === 4) {
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  return false;
}

function validateUrl(urlString: string): URL {
  const url = new URL(urlString);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }
  if (isPrivateIP(url.hostname)) {
    throw new Error('Private IP addresses are not allowed');
  }
  return url;
}

function extractMetadata(html: string, sourceUrl?: string): PreviewResponse {
  const $ = cheerio.load(html);
  const result: PreviewResponse = {};

  if (sourceUrl) result.sourceUrl = sourceUrl;

  result.title = $('meta[property="og:title"]').attr('content');
  result.image = $('meta[property="og:image"]').attr('content');
  result.siteName = $('meta[property="og:site_name"]').attr('content');

  const ogPrice = $('meta[property="product:price:amount"]').attr('content');
  const ogCurrency = $('meta[property="product:price:currency"]').attr('content');
  if (ogPrice) {
    result.price = ogPrice;
    result.currency = ogCurrency;
  }

  if (!result.title) {
    result.title = $('meta[name="twitter:title"], meta[property="twitter:title"]').attr('content');
  }
  if (!result.image) {
    result.image = $('meta[name="twitter:image"], meta[property="twitter:image"]').attr('content');
  }
  if (!result.siteName) {
    result.siteName = $('meta[name="twitter:site"], meta[property="twitter:site"]').attr('content');
  }

  if (!result.title) {
    result.title = $('title').text().trim() || $('h1').first().text().trim();
  }
  if (!result.image) {
    const img = $('img[src]').first().attr('src');
    if (img) result.image = img;
  }
  if (!result.siteName && sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      result.siteName = url.hostname;
    } catch {}
  }

  if (!result.price) {
    const text = $.text();
    const pricePatterns = [
      /\$(\d+(?:\.\d{2})?)/,
      /(\d+(?:\.\d{2})?)\s*USD/i,
      /(\d+(?:\.\d{2})?)\s*EUR/i,
      /£(\d+(?:\.\d{2})?)/,
      /€(\d+(?:\.\d{2})?)/,
    ];
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.price = match[1] || match[0];
        if (pattern.source.includes('\\$')) result.currency = 'USD';
        else if (pattern.source.includes('USD')) result.currency = 'USD';
        else if (pattern.source.includes('EUR')) result.currency = 'EUR';
        else if (pattern.source.includes('£')) result.currency = 'GBP';
        else if (pattern.source.includes('€')) result.currency = 'EUR';
        break;
      }
    }
  }

  return result;
}

export async function previewHandler(req: Request, res: Response): Promise<void> {
  try {
    const { url, raw_html }: PreviewRequest = req.body;

    if (!url && !raw_html) {
      res.status(400).json({ error: 'Either "url" or "raw_html" must be provided' });
      return;
    }

    let html: string;
    let sourceUrl: string | undefined;

    if (raw_html) {
      html = raw_html;
    } else if (url) {
      try {
        const validatedUrl = validateUrl(url);
        sourceUrl = validatedUrl.toString();

        const MAX_SIZE = 512 * 1024;
        const MAX_REDIRECTS = 3;

        let currentUrl = sourceUrl;
        let redirects = 0;

        while (true) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(currentUrl, {
            signal: controller.signal,
            redirect: 'manual', // manual redirect handling
          });

          clearTimeout(timeout);

          // Handle redirects manually
          if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
            if (redirects >= MAX_REDIRECTS) {
              res.status(400).json({ error: 'Failed to fetch URL' });
              return;
            }
            redirects++;
            currentUrl = new URL(response.headers.get('location')!, currentUrl).toString();
            continue;
          }

          if (!response.ok) {
            res.status(400).json({ error: 'Failed to fetch URL' });
            return;
          }

          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            res.status(400).json({ error: 'URL must return HTML content' });
            return;
          }

          // Stream body and enforce 512KB cap
          const reader = response.body?.getReader();
          if (!reader) {
            res.status(400).json({ error: 'Failed to fetch URL' });
            return;
          }

          let received = 0;
          const chunks: Uint8Array[] = [];

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              // Check if adding this chunk would exceed the limit
              if (received + value.length > MAX_SIZE) {
                await reader.cancel();
                res.status(400).json({ error: 'Content size exceeds 512KB limit' });
                return;
              }
              
              received += value.length;
              chunks.push(value);
            }
          } catch (error) {
            await reader.cancel();
            throw error;
          }

          html = Buffer.concat(chunks).toString('utf-8');
          break;
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          res.status(400).json({ error: 'Failed to fetch URL (timeout)' });
          return;
        }
        if (error instanceof Error && (error.message.includes('Private IP') || error.message.includes('protocols'))) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.status(400).json({ error: 'Failed to fetch URL: Invalid URL or network error' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Either "url" or "raw_html" must be provided' });
      return;
    }

    const metadata = extractMetadata(html, sourceUrl);
    res.json(metadata);
  } catch (error) {
    console.error('Preview handler error:', error);
    res.status(500).json({ error: 'Internal server error while processing preview' });
  }
}