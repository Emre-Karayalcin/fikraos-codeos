// SECURITY FIX (P1): SSRF Protection - URL Validation Utility
// Prevents Server-Side Request Forgery attacks by validating URLs before fetching

import { URL } from 'url';
import dns from 'dns/promises';

// Allowlist of domains permitted for URL fetching
const ALLOWED_DOMAINS = [
  'docs.google.com',
  'drive.google.com',
  'storage.googleapis.com',
  'www.googleapis.com',
];

// Blocked IP ranges (private networks, localhost, link-local)
const BLOCKED_IP_RANGES = [
  /^127\./,                          // Localhost (127.0.0.0/8)
  /^10\./,                           // Private Class A (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private Class B (172.16.0.0/12)
  /^192\.168\./,                     // Private Class C (192.168.0.0/16)
  /^169\.254\./,                     // Link-local (169.254.0.0/16)
  /^0\./,                            // Invalid (0.0.0.0/8)
  /^::1$/,                           // IPv6 localhost
  /^fe80:/i,                         // IPv6 link-local
  /^fc00:/i,                         // IPv6 unique local
  /^fd00:/i,                         // IPv6 unique local
];

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * SECURITY FIX (P1): Validates URLs before fetching to prevent SSRF attacks
 *
 * Protection layers:
 * 1. Protocol validation (only HTTP/HTTPS)
 * 2. Domain allowlist check
 * 3. DNS resolution and IP blocklist check
 *
 * @param urlString - The URL to validate
 * @returns Validation result with error message if invalid
 */
export async function validateUrl(urlString: string): Promise<UrlValidationResult> {
  try {
    const url = new URL(urlString);

    // Layer 1: Protocol validation
    if (!['https:', 'http:'].includes(url.protocol)) {
      return {
        valid: false,
        error: 'Invalid protocol. Only HTTP and HTTPS are allowed.'
      };
    }

    // Layer 2: Domain allowlist check
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      return {
        valid: false,
        error: `Domain not in allowlist. Allowed domains: ${ALLOWED_DOMAINS.join(', ')}`
      };
    }

    // Layer 3: DNS resolution and IP blocklist check
    try {
      // Resolve both IPv4 and IPv6 addresses
      const addresses4 = await dns.resolve4(url.hostname).catch(() => []);
      const addresses6 = await dns.resolve6(url.hostname).catch(() => []);
      const allAddresses = [...addresses4, ...addresses6];

      if (allAddresses.length === 0) {
        return {
          valid: false,
          error: 'Unable to resolve hostname to IP address.'
        };
      }

      // Check if any resolved IP matches blocked ranges
      for (const ip of allAddresses) {
        for (const pattern of BLOCKED_IP_RANGES) {
          if (pattern.test(ip)) {
            console.warn(`🚨 SSRF attempt blocked: ${urlString} resolved to blocked IP ${ip}`);
            return {
              valid: false,
              error: 'URL resolves to a blocked IP range (private network/localhost).'
            };
          }
        }
      }
    } catch (dnsError) {
      return {
        valid: false,
        error: 'DNS resolution failed. Hostname may not exist.'
      };
    }

    // All checks passed
    return { valid: true };

  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format.'
    };
  }
}

/**
 * Convenience function for throwing on invalid URLs
 */
export async function validateUrlOrThrow(urlString: string): Promise<void> {
  const result = await validateUrl(urlString);
  if (!result.valid) {
    throw new Error(`URL validation failed: ${result.error}`);
  }
}
