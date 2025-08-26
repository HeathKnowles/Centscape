/**
 * Normalize URL by removing tracking parameters, lowercasing host, and stripping fragments
 * @param url - The URL to normalize
 * @returns string - Normalized URL for deduplication
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Lowercase the hostname
    urlObj.hostname = urlObj.hostname.toLowerCase();
    
    // Remove fragment
    urlObj.hash = '';
    
    // Remove UTM and other tracking parameters
    const paramsToRemove = [
      // UTM parameters
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      // Facebook tracking
      'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source',
      // Google tracking
      'gclid', 'gclsrc', 'dclid',
      // Other common tracking
      'ref', 'referrer', 'source', 'campaign', 'medium',
      // Social media tracking
      'igshid', 'ncid', 'sr_share',
      // Email tracking
      'mc_cid', 'mc_eid',
      // General tracking
      '_ga', '_gl', 'hsCtaTracking'
    ];
    
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Also remove any parameter that starts with utm_
    for (const [key] of urlObj.searchParams) {
      if (key.startsWith('utm_')) {
        urlObj.searchParams.delete(key);
      }
    }
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Extract domain from URL for display purposes
 * @param url - The URL to extract domain from
 * @returns string - Domain name (e.g., "amazon.com")
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return 'Unknown source';
  }
}