import { promisify } from 'util';
import { lookup } from 'dns';
import { isIP } from 'net';
import * as cheerio from 'cheerio';

const dnsLookup = promisify(lookup);


export async function isPrivateIp(hostname: string): Promise<boolean> {
  try {
    if (!hostname) return true;

    const literal = hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;

    if (literal.toLowerCase() === 'localhost') return true;

    const ipType = isIP(literal);
    if (ipType === 4) return isPrivateIPv4(literal);
    if (ipType === 6) return isPrivateIPv6(literal);

    const results = await dnsLookup(literal, { all: true });
    if (!results || results.length === 0) return true;

    for (const r of results) {
      const t = isIP(r.address);
      if (t === 4 && isPrivateIPv4(r.address)) return true;
      if (t === 6 && isPrivateIPv6(r.address)) return true;
    }

    return false;
  } catch {
    return true;
  }
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) return true;

  const [a, b] = parts;


  if (a === 127) return true;

  
  if (a === 10) return true;                         
  if (a === 172 && b >= 16 && b <= 31) return true;  
  if (a === 192 && b === 168) return true;           

  // Link-local 169.254.0.0/16
  if (a === 169 && b === 254) return true;

  // 0.0.0.0/8, multicast 224.0.0.0/4, reserved >= 240.0.0.0
  if (a === 0) return true;
  if (a >= 224 && a <= 239) return true;
  if (a >= 240) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();

  const zoneIdx = v.indexOf('%');
  const addr = zoneIdx >= 0 ? v.slice(0, zoneIdx) : v;

  if (addr === '::1' || addr === '::') return true;

  if (addr.startsWith('::ffff:')) {
    const lastColon = addr.lastIndexOf(':');
    const v4 = addr.slice(lastColon + 1);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  if (/^f[c-d][0-9a-f]*:/i.test(addr)) return true;
  if (/^fe[89ab][0-9a-f]*:/i.test(addr)) return true;
  if (/^fe[c-f][0-9a-f]*:/i.test(addr)) return true;
  if (/^ff[0-9a-f]*:/i.test(addr)) return true;
  if (/^2001:db8:/i.test(addr)) return true;

  return false;
}
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hostname = urlObj.hostname.toLowerCase();
    urlObj.hash = '';

    const paramsToRemove = [
      // UTM
      'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
      // Facebook
      'fbclid','fb_action_ids','fb_action_types','fb_ref','fb_source',
      // Google
      'gclid','gclsrc','dclid',
      // Other common
      'ref','referrer','source','campaign','medium',
      // Social
      'igshid','ncid','sr_share',
      // Email
      'mc_cid','mc_eid',
      // General
      '_ga','_gl','hsCtaTracking'
    ];

    paramsToRemove.forEach((p) => urlObj.searchParams.delete(p));
    for (const [key] of urlObj.searchParams) {
      if (key.startsWith('utm_')) urlObj.searchParams.delete(key);
    }
    // If emptied, clear the "?" completely
    if ([...urlObj.searchParams.keys()].length === 0) {
      urlObj.search = '';
    }

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Extract meta tag content by trying multiple possible attribute names.
 */
export function extractMeta($: cheerio.CheerioAPI, names: string[]): string | null {
  for (const name of names) {
    const selectors = [
      `meta[name="${name}"]`,
      `meta[property="${name}"]`,
      `meta[itemprop="${name}"]`,
      `meta[http-equiv="${name}"]`,
    ];
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length) {
        const content =
          el.attr('content') ??
          el.attr('value') ??
          el.attr('charset') ??
          null;
        if (content && content.trim()) {
          return content.trim();
        }
      }
    }
  }
  return null;
}

