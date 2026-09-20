import { describe, it, expect } from 'vitest';
import { generateSecureToken, hashToken, generateDocumentHash } from '@/lib/quotations/tokens';

describe('Quotation Security & Token Functions', () => {
  it('generates random, unguessable URL-safe tokens', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);

    expect(token1).toHaveLength(43); // 32 bytes base64url length is 43 chars
    expect(token2).toHaveLength(43);
    expect(token1).not.toBe(token2);
    expect(token1).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('produces deterministic SHA-256 hashes', () => {
    const raw = 'test_token_string_12345';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates reproducible document snapshot hashes for approved quotations', () => {
    const payload = {
      quotation_id: 'q_1',
      quotation_number: 'Q-000001',
      customer_id: 'cust_1',
      grand_total: 53100,
      currency: 'INR',
      issue_date: '2026-09-20',
      valid_until: '2026-10-20',
      items: [
        {
          description: 'DevOps Setup',
          quantity: 1,
          unit_price: 50000,
          line_total: 50000,
        },
      ],
      approved_at: '2026-09-20T12:00:00.000Z',
      signer_name: 'John Mathew',
      signer_email: 'john@example.com',
    };

    const hashA = generateDocumentHash(payload);
    const hashB = generateDocumentHash(payload);
    expect(hashA).toBe(hashB);
    expect(hashA).toHaveLength(64);

    // Modifying grand total or any detail produces a different hash (tamper detection)
    const tamperedHash = generateDocumentHash({ ...payload, grand_total: 45000 });
    expect(tamperedHash).not.toBe(hashA);
  });
});
