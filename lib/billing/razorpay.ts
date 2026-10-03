import crypto from 'crypto';
import { getDeveloperAdminConfig } from '@/lib/billing/dev-admin-auth';

export interface RazorpayPlanResponse {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    description?: string;
  };
}

export interface RazorpaySubscriptionResponse {
  id: string;
  entity: string;
  plan_id: string;
  status: 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired';
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  charge_at: number | null;
  start_at: number | null;
  total_count: number;
  paid_count: number;
  remaining_count: number;
  customer_notify: number;
  short_url?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: 'created' | 'attempted' | 'paid';
  notes?: Record<string, string>;
}

export class RazorpayService {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;
  private mode: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor() {
    this.keyId = '';
    this.keySecret = '';
    this.webhookSecret = '';
    this.mode = 'test';
    this.reloadCredentials();
  }

  public reloadCredentials(): void {
    let cfgKeyId: string | null = null;
    let cfgKeySecret: string | null = null;
    let cfgMode: string | null = null;
    try {
      const cfg = getDeveloperAdminConfig();
      cfgKeyId = cfg.razorpayKeyId || null;
      cfgKeySecret = cfg.razorpayKeySecret || null;
      cfgMode = cfg.razorpayMode || null;
    } catch {}

    this.keyId =
      cfgKeyId ||
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      '';
    this.keySecret = cfgKeySecret || process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (cfgMode) {
      this.mode = cfgMode.toLowerCase();
    } else if (this.keyId.startsWith('rzp_live_')) {
      this.mode = 'live';
    } else if (this.keyId.startsWith('rzp_test_')) {
      this.mode = (process.env.RAZORPAY_MODE || 'live').toLowerCase() === 'test' ? 'test' : 'live';
    } else {
      this.mode = 'live';
    }
  }

  public getMode(): string {
    return this.mode;
  }

  public getKeyId(): string {
    this.reloadCredentials();
    return this.keyId;
  }

  public getKeySecret(): string {
    this.reloadCredentials();
    return this.keySecret || 'mock_secret_for_tests';
  }

  public getGracePeriodDays(): number {
    const val = parseInt(process.env.PAYMENT_GRACE_PERIOD_DAYS || '7', 10);
    return isNaN(val) || val <= 0 ? 7 : val;
  }

  public isConfigured(): boolean {
    return Boolean(
      this.keyId &&
      this.keySecret &&
      !this.keyId.includes('placeholder') &&
      !this.keySecret.includes('placeholder')
    );
  }

  /**
   * Test Razorpay connection and fetch plan details
   */
  public async testConnection(promoPlanId?: string | null, standardPlanId?: string | null): Promise<{
    configured: boolean;
    mode: string;
    keyId: string;
    hasSecret: boolean;
    hasWebhookSecret: boolean;
    apiSuccess: boolean;
    apiMessage: string;
    promoPlanDetails?: any;
    standardPlanDetails?: any;
    availablePlans?: Array<{
      id: string;
      name: string;
      amount: number;
      currency: string;
      period?: string;
      interval?: number;
    }>;
  }> {
    const keyId = this.keyId;
    const hasSecret = Boolean(this.keySecret && !this.keySecret.includes('placeholder'));
    const hasWebhookSecret = Boolean(this.webhookSecret && !this.webhookSecret.includes('placeholder'));

    if (!this.isConfigured()) {
      return {
        configured: false,
        mode: this.mode,
        keyId: keyId ? `${keyId.substring(0, 8)}...` : 'Not Set',
        hasSecret,
        hasWebhookSecret,
        apiSuccess: false,
        apiMessage: 'Razorpay credentials are using placeholder values or not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel environment variables.',
      };
    }

    try {
      // Test fetching plans from Razorpay API
      const res = await fetch(`${this.baseUrl}/plans?count=20`, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          configured: true,
          mode: this.mode,
          keyId: `${keyId.substring(0, 8)}...`,
          hasSecret,
          hasWebhookSecret,
          apiSuccess: false,
          apiMessage: `Razorpay API authentication failed (${res.status}): ${errText}`,
        };
      }

      const data = await res.json();
      const rawPlans = (data.items || []).map((p: any) => ({
        id: p.id,
        name: p.item?.name || 'Unnamed Plan',
        amount: p.item?.amount || 0,
        currency: p.item?.currency || 'INR',
        period: p.period || 'monthly',
        interval: p.interval || 1,
      }));

      let promoDetails: any = null;
      let standardDetails: any = null;

      // 1. Resolve promo plan by ID if provided
      if (promoPlanId) {
        const matched = rawPlans.find((p: any) => p.id === promoPlanId);
        if (matched) {
          promoDetails = matched;
        } else {
          try {
            const pRes = await fetch(`${this.baseUrl}/plans/${promoPlanId}`, {
              headers: { Authorization: this.getAuthHeader() },
            });
            if (pRes.ok) {
              const pJson = await pRes.json();
              promoDetails = {
                id: pJson.id,
                name: pJson.item?.name,
                amount: pJson.item?.amount,
                currency: pJson.item?.currency,
              };
            }
          } catch {}
        }
      }

      // If not resolved by ID, auto-detect from available plans (amount: 9900 = ₹99)
      if (!promoDetails) {
        const auto99 = rawPlans.find(
          (p: any) => p.amount === 9900 || p.name?.toLowerCase().includes('99') || p.name?.toLowerCase().includes('promo')
        );
        if (auto99) {
          promoDetails = {
            ...auto99,
            isAutoDetected: true,
          };
        }
      }

      // 2. Resolve standard plan by ID if provided
      if (standardPlanId) {
        const matched = rawPlans.find((p: any) => p.id === standardPlanId);
        if (matched) {
          standardDetails = matched;
        } else {
          try {
            const sRes = await fetch(`${this.baseUrl}/plans/${standardPlanId}`, {
              headers: { Authorization: this.getAuthHeader() },
            });
            if (sRes.ok) {
              const sJson = await sRes.json();
              standardDetails = {
                id: sJson.id,
                name: sJson.item?.name,
                amount: sJson.item?.amount,
                currency: sJson.item?.currency,
              };
            }
          } catch {}
        }
      }

      // If not resolved by ID, auto-detect from available plans (amount: 19900 = ₹199)
      if (!standardDetails) {
        const auto199 = rawPlans.find(
          (p: any) => p.amount === 19900 || p.name?.toLowerCase().includes('199') || p.name?.toLowerCase().includes('standard')
        );
        if (auto199) {
          standardDetails = {
            ...auto199,
            isAutoDetected: true,
          };
        }
      }

      const planCount = data.count || rawPlans.length;
      return {
        configured: true,
        mode: this.mode,
        keyId: `${keyId.substring(0, 8)}...`,
        hasSecret,
        hasWebhookSecret,
        apiSuccess: true,
        apiMessage: `✓ Connected successfully to Razorpay API (${this.mode.toUpperCase()} mode). Found ${planCount} plans in account.`,
        promoPlanDetails: promoDetails,
        standardPlanDetails: standardDetails,
        availablePlans: rawPlans,
      };
    } catch (err: any) {
      return {
        configured: true,
        mode: this.mode,
        keyId: `${keyId.substring(0, 8)}...`,
        hasSecret,
        hasWebhookSecret,
        apiSuccess: false,
        apiMessage: `Network or connection error to Razorpay: ${err.message}`,
      };
    }
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Create or fetch a Razorpay recurring billing plan
   */
  public async createPlan(params: {
    name: string;
    amount: number; // in paise (e.g. 9900 = ₹99)
    currency?: string;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    description?: string;
  }): Promise<RazorpayPlanResponse> {
    const currency = params.currency || 'INR';
    const period = params.period || 'monthly';
    const interval = params.interval || 1;

    if (process.env.VITEST || process.env.NODE_ENV === 'test' || !this.isConfigured()) {
      return {
        id: `plan_mock_${params.amount}_${Date.now()}`,
        entity: 'plan',
        interval,
        period,
        item: {
          id: `item_mock_${Date.now()}`,
          name: params.name,
          amount: params.amount,
          currency,
          description: params.description,
        },
      };
    }

    const res = await fetch(`${this.baseUrl}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify({
        period,
        interval,
        item: {
          name: params.name,
          amount: params.amount,
          currency,
          description: params.description,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay createPlan failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Create a Razorpay subscription for recurring billing
   */
  public async createSubscription(params: {
    planId: string;
    totalCount?: number;
    customerNotify?: 0 | 1;
    startAt?: number; // UNIX timestamp
    notes?: Record<string, string>;
  }): Promise<RazorpaySubscriptionResponse> {
    const totalCount = params.totalCount || 60; // 5 years monthly default
    const customerNotify = params.customerNotify !== undefined ? params.customerNotify : 1;

    if (process.env.VITEST || process.env.NODE_ENV === 'test' || !this.isConfigured()) {
      const subId = `sub_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        id: subId,
        entity: 'subscription',
        plan_id: params.planId,
        status: 'created',
        current_start: null,
        current_end: null,
        ended_at: null,
        charge_at: null,
        start_at: params.startAt || null,
        total_count: totalCount,
        paid_count: 0,
        remaining_count: totalCount,
        customer_notify: customerNotify,
        short_url: `https://rzp.io/i/${subId}`,
        notes: params.notes,
      };
    }

    const payload: Record<string, any> = {
      plan_id: params.planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: customerNotify,
      notes: params.notes || {},
    };

    if (params.startAt) {
      payload.start_at = params.startAt;
    }

    const res = await fetch(`${this.baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay createSubscription failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Retrieve Subscription by Razorpay subscription ID
   */
  public async getSubscription(subscriptionId: string): Promise<RazorpaySubscriptionResponse> {
    if (!this.isConfigured() || subscriptionId.startsWith('sub_mock_')) {
      return {
        id: subscriptionId,
        entity: 'subscription',
        plan_id: 'plan_mock',
        status: 'active',
        current_start: Math.floor(Date.now() / 1000),
        current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        ended_at: null,
        charge_at: Math.floor(Date.now() / 1000) + 30 * 86400,
        start_at: Math.floor(Date.now() / 1000),
        total_count: 60,
        paid_count: 1,
        remaining_count: 59,
        customer_notify: 1,
      };
    }

    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      headers: { Authorization: this.getAuthHeader() },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay getSubscription failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Fetch payment details by payment ID from Razorpay
   */
  public async fetchPayment(paymentId: string): Promise<any | null> {
    if (!this.isConfigured() || paymentId.startsWith('pay_mock_')) {
      return null;
    }
    try {
      const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        headers: { Authorization: this.getAuthHeader() },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetch invoice details by invoice ID from Razorpay
   */
  public async fetchInvoice(invoiceId: string): Promise<any | null> {
    if (!this.isConfigured() || invoiceId.startsWith('inv_mock_')) {
      return null;
    }
    try {
      const res = await fetch(`${this.baseUrl}/invoices/${invoiceId}`, {
        headers: { Authorization: this.getAuthHeader() },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Update Subscription Plan (e.g. promotional ₹99 -> standard ₹199 transition)
   */
  public async updateSubscriptionPlan(
    subscriptionId: string,
    newPlanId: string,
    scheduleChangeAt: 'now' | 'cycle_end' = 'cycle_end'
  ): Promise<RazorpaySubscriptionResponse> {
    if (!this.isConfigured() || subscriptionId.startsWith('sub_mock_')) {
      return {
        id: subscriptionId,
        entity: 'subscription',
        plan_id: newPlanId,
        status: 'active',
        current_start: Math.floor(Date.now() / 1000),
        current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        ended_at: null,
        charge_at: Math.floor(Date.now() / 1000) + 30 * 86400,
        start_at: Math.floor(Date.now() / 1000),
        total_count: 60,
        paid_count: 1,
        remaining_count: 59,
        customer_notify: 1,
      };
    }

    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify({
        plan_id: newPlanId,
        schedule_change_at: scheduleChangeAt,
        customer_notify: 1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay updateSubscriptionPlan failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Cancel Subscription
   */
  public async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean = true
  ): Promise<RazorpaySubscriptionResponse> {
    if (!this.isConfigured() || subscriptionId.startsWith('sub_mock_')) {
      return {
        id: subscriptionId,
        entity: 'subscription',
        plan_id: 'plan_mock',
        status: cancelAtCycleEnd ? 'active' : 'cancelled',
        current_start: Math.floor(Date.now() / 1000),
        current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        ended_at: cancelAtCycleEnd ? null : Math.floor(Date.now() / 1000),
        charge_at: null,
        start_at: Math.floor(Date.now() / 1000),
        total_count: 60,
        paid_count: 1,
        remaining_count: 0,
        customer_notify: 1,
      };
    }

    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify({
        cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay cancelSubscription failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Create Razorpay Standard Checkout Order (One-Time)
   */
  public async createOrder(params: {
    amount: number; // in paise
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrderResponse> {
    const currency = params.currency || 'INR';

    if (params.amount < 100) {
      throw new Error('Amount must be at least 100 paise (₹1.00)');
    }

    if (!this.isConfigured()) {
      const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        id: orderId,
        entity: 'order',
        amount: params.amount,
        amount_paid: 0,
        amount_due: params.amount,
        currency,
        receipt: params.receipt || `rcpt_${Date.now()}`,
        status: 'created',
        notes: params.notes,
      };
    }

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify({
        amount: params.amount,
        currency,
        receipt: params.receipt || `rcpt_${Date.now()}`,
        notes: params.notes || {},
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Razorpay createOrder failed (${res.status}): ${errText}`);
    }

    return await res.json();
  }

  /**
   * Verify Standard Checkout Order Signature
   * HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
   */
  public verifyOrderSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    if (!params.orderId || !params.paymentId || !params.signature) {
      return false;
    }

    const secret = this.keySecret || 'mock_secret_for_tests';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(params.signature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify Subscription Recurring Payment Callback Signature
   * HMAC-SHA256(payment_id + "|" + subscription_id, RAZORPAY_KEY_SECRET)
   */
  public verifySubscriptionSignature(params: {
    paymentId: string;
    subscriptionId: string;
    signature: string;
  }): boolean {
    if (!params.paymentId || !params.subscriptionId || !params.signature) {
      return false;
    }

    // In mock mode (no real keys configured in Vercel), accept simulated signature
    if (!this.isConfigured() && params.signature.startsWith('mock_sig_')) {
      return true;
    }

    const secret = this.keySecret || 'mock_secret_for_tests';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${params.paymentId}|${params.subscriptionId}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(params.signature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Verify Webhook Signature
   * HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!rawBody || !signature) {
      return false;
    }

    const secret = this.webhookSecret || this.keySecret || 'mock_webhook_secret';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(signature, 'utf-8')
      );
    } catch {
      return false;
    }
  }
}

export const razorpayService = new RazorpayService();
