/**
 * HTML Escaping & Sanitization Utilities
 *
 * Implements context-aware HTML entity encoding to prevent HTML/XSS injection
 * into transactional email templates and rendered documents.
 */

export class SafeHtmlString {
  constructor(public readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

/**
 * Marks a string as already safe HTML, preventing escapeHtml from re-encoding it.
 * Use ONLY with developer-controlled static markup. Never pass user input to rawHtml.
 */
export function rawHtml(markup: string): SafeHtmlString {
  return new SafeHtmlString(markup);
}

/**
 * Escapes characters with special meaning in HTML (&, <, >, ", ', /).
 * Treats null/undefined as empty string.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof SafeHtmlString) {
    return value.value;
  }
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes a URL destination for href/src attributes.
 * Rejects javascript:, data:, and other dangerous URI schemes.
 * Encodes special characters (<, >, ", ', &) for attribute safety while preserving URL path slashes.
 */
export function sanitizeUrl(url: unknown, fallback: string = '#'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Block dangerous schemes
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return fallback;
  }

  // Block protocol-relative URLs
  if (trimmed.startsWith('//')) {
    return fallback;
  }

  const escapeAttr = (str: string) =>
    str.replace(/[<>"'&]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '&': return '&amp;';
        default: return c;
      }
    });

  // Allow relative URLs starting with / (excluding //)
  if (trimmed.startsWith('/')) {
    return escapeAttr(trimmed);
  }

  // Allow http: and https: protocols
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return escapeAttr(parsed.toString());
      }
    } catch {
      return fallback;
    }
  }

  // Allow mailto: and tel:
  if (/^(mailto|tel):/i.test(trimmed)) {
    return escapeAttr(trimmed);
  }

  return fallback;
}

/**
 * Safe tagged template literal.
 * Automatically HTML-escapes all interpolated variables unless marked with rawHtml().
 *
 * Example:
 *   const markup = safeHtml`<p>Hello ${userName}</p>`;
 */
export function safeHtml(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += escapeHtml(values[i]) + strings[i + 1];
  }
  return result;
}

/**
 * Converts HTML content to a clean, readable plain-text fallback string.
 */
export function stripHtmlToText(html: string): string {
  if (!html) return '';
  return html
    // Replace breaks and paragraphs with newlines
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    // Normalize multiple whitespace and newlines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}
