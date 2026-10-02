import crypto from 'crypto';

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
    this.keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    this.mode = (process.env.RAZORPAY_MODE || 'test').toLowerCase();
  }

  public getMode(): string {
    return this.mode;
  }

  public getKeyId(): string {
    return this.keyId;
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

    if (!this.isConfigured()) {
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

    if (!this.isConfigured()) {
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
