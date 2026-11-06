import crypto from 'crypto';

export interface NowPaymentsInvoiceResponse {
  id: string;
  order_id: string;
  order_description?: string;
  price_amount: string | number;
  price_currency: string;
  pay_currency?: string | null;
  ipn_callback_url?: string;
  invoice_url: string;
  success_url?: string;
  cancel_url?: string;
  created_at: string;
  updated_at: string;
  is_mock?: boolean;
}

export interface NowPaymentsIpnPayload {
  payment_id: number | string;
  payment_status:
    | 'waiting'
    | 'confirming'
    | 'confirmed'
    | 'sending'
    | 'partially_paid'
    | 'finished'
    | 'failed'
    | 'refunded'
    | 'expired';
  pay_address?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  actually_paid?: number;
  pay_currency?: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  created_at?: string;
  updated_at?: string;
  outcome_amount?: number;
  outcome_currency?: string;
  network?: string;
  [key: string]: any;
}

class NowPaymentsService {
  public getApiKey(): string | null {
    return (
      process.env.NOWPAYMENTS_API_KEY?.trim() ||
      null
    );
  }

  public getIpnSecret(): string | null {
    return (
      process.env.NOWPAYMENTS_IPN_SECRET?.trim() ||
      null
    );
  }

  public getApiUrl(): string {
    return (
      process.env.NOWPAYMENTS_API_URL?.trim() ||
      'https://api.nowpayments.io/v1'
    );
  }

  /**
   * Create an invoice for $12 USD QuoteFlow Pro subscription
   */
  public async createInvoice(params: {
    orderId: string;
    orderDescription: string;
    priceAmount: number;
    priceCurrency: string;
    ipnCallbackUrl: string;
    successUrl: string;
    cancelUrl: string;
    isFeePaidByUser?: boolean;
    isFixedRate?: boolean;
  }): Promise<NowPaymentsInvoiceResponse> {
    const apiKey = this.getApiKey();
    const apiUrl = this.getApiUrl();

    // If API key is available, call live NOWPayments API
    if (apiKey && apiKey !== 'mock_nowpayments_api_key') {
      try {
        const payload: Record<string, any> = {
          price_amount: params.priceAmount,
          price_currency: params.priceCurrency.toLowerCase(),
          order_id: params.orderId,
          order_description: params.orderDescription,
          ipn_callback_url: params.ipnCallbackUrl,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        };

        if (params.isFeePaidByUser === true) {
          payload.is_fee_paid_by_user = true;
        }
        if (params.isFixedRate === true) {
          payload.is_fixed_rate = true;
        }

        const res = await fetch(`${apiUrl}/invoice`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'NOWPayments invoice creation failed');
        }

        return {
          id: String(data.id),
          order_id: data.order_id || params.orderId,
          order_description: data.order_description || params.orderDescription,
          price_amount: data.price_amount,
          price_currency: data.price_currency,
          pay_currency: data.pay_currency,
          ipn_callback_url: data.ipn_callback_url,
          invoice_url: data.invoice_url,
          success_url: data.success_url,
          cancel_url: data.cancel_url,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
      } catch (err: any) {
        console.error('NOWPayments API call error:', err);
        throw err;
      }
    }

    // Developer / Sandbox fallback mode if no API key is yet configured in env
    const mockId = `np_inv_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const mockInvoiceUrl = `${params.successUrl}?simulated_nowpayments=true&invoice_id=${mockId}&order_id=${encodeURIComponent(
      params.orderId
    )}`;

    return {
      id: mockId,
      order_id: params.orderId,
      order_description: params.orderDescription,
      price_amount: params.priceAmount,
      price_currency: params.priceCurrency,
      pay_currency: 'usdttrc20',
      ipn_callback_url: params.ipnCallbackUrl,
      invoice_url: mockInvoiceUrl,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_mock: true,
    };
  }

  /**
   * Sort object keys recursively for HMAC-SHA512 validation
   * according to NOWPayments documentation
   */
  public sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return obj;
    }
    return Object.keys(obj)
      .sort()
      .reduce((result: any, key: string) => {
        result[key] = this.sortObject(obj[key]);
        return result;
      }, {});
  }

  /**
   * Validate NOWPayments IPN using HMAC SHA-512 over sorted JSON payload
   */
  public verifyIpnSignature(
    payload: Record<string, any>,
    receivedSignature?: string | null
  ): boolean {
    if (!receivedSignature) return false;

    const secret = this.getIpnSecret();
    if (!secret) {
      console.warn('NOWPAYMENTS_IPN_SECRET is not configured; cannot verify signature.');
      // If in mock/dev mode without secret, accept dev simulation token
      if (process.env.NODE_ENV !== 'production' && receivedSignature === 'dev-simulated-sig') {
        return true;
      }
      return false;
    }

    try {
      const sortedPayload = this.sortObject(payload);
      const sortedJson = JSON.stringify(sortedPayload);

      const hmac = crypto.createHmac('sha512', secret);
      hmac.update(sortedJson);
      const calculatedSignature = hmac.digest('hex');

      const sigA = Buffer.from(calculatedSignature.toLowerCase(), 'utf8');
      const sigB = Buffer.from(receivedSignature.trim().toLowerCase(), 'utf8');

      if (sigA.length !== sigB.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigA, sigB);
    } catch (err) {
      console.error('NOWPayments IPN signature check error:', err);
      return false;
    }
  }

  /**
   * Query status of a specific payment from NOWPayments
   */
  public async getPaymentStatus(paymentId: string | number): Promise<any> {
    const apiKey = this.getApiKey();
    const apiUrl = this.getApiUrl();
    if (!apiKey) return null;

    try {
      const res = await fetch(`${apiUrl}/payment/${paymentId}`, {
        headers: { 'x-api-key': apiKey },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('NOWPayments getPaymentStatus error:', err);
    }
    return null;
  }
}

export const nowpaymentsService = new NowPaymentsService();
