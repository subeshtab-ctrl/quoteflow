import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postRedeemRoute } from '@/app/api/redeem/route';

describe('AppSumo Voucher Redemption API', () => {
  it('rejects empty voucher code with 400', async () => {
    const req = new NextRequest('http://localhost/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '' }),
    });
    const res = await postRedeemRoute(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Please enter your AppSumo voucher code');
  });

  it('rejects invalid voucher code with 404', async () => {
    const req = new NextRequest('http://localhost/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'FAKE-CODE-99999' }),
    });
    const res = await postRedeemRoute(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('Invalid voucher code');
  });

  it('identifies valid code from data/appsumo-codes.json', async () => {
    const req = new NextRequest('http://localhost/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'QF-YZGQ-5XJM-L6AA' }),
    });
    const res = await postRedeemRoute(req);
    // When called unauthenticated, returns 200 with requiresAuth: true
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.requiresAuth).toBe(true);
  });
});
