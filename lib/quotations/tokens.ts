import crypto from 'crypto';

/**
 * Generate a cryptographically secure, URL-safe random public token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Compute SHA-256 hash of a string (e.g., public token)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Compute an immutable document snapshot hash for an approved quotation
 */
export function generateDocumentHash(payload: {
  quotation_id: string;
  quotation_number: string;
  customer_id: string;
  grand_total: number;
  currency: string;
  issue_date: string;
  valid_until: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  approved_at: string;
  signer_name: string;
  signer_email: string;
}): string {
  const serialized = JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}
