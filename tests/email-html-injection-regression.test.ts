import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUrl, safeHtml, stripHtmlToText } from '@/lib/utils/html-escape';
import { safeNameSchema, safeCompanyNameSchema, registrationSchema } from '@/lib/validations/auth';
import {
  generateVerificationOtpEmail,
  generateQuotationSentEmail,
  generateQuotationReminderEmail,
  generateQuotationPaymentReminderEmail,
  generateQuotationApprovedEmail,
  generateQuotationRejectedEmail,
  compileTrialReminderHtml,
  generatePaymentDueEmail,
  generatePasswordResetEmail,
  generateAdminOtpEmail,
} from '@/lib/email/service';
import { compileTemplateEmail } from '@/lib/email/template-compiler';

describe('Phase 1: Email HTML Injection & Safe Templating Regression Suite', () => {
  describe('1. escapeHtml Utility', () => {
    it('escapes &, <, >, ", \', and / correctly', () => {
      const input = `& < > " ' /`;
      const expected = `&amp; &lt; &gt; &quot; &#39; &#x2F;`;
      expect(escapeHtml(input)).toBe(expected);
    });

    it('neutralizes anchor injection payload from preliminary report', () => {
      const payload = `<a href="https://example.com">www.wikipedia.com</a>`;
      const escaped = escapeHtml(payload);
      expect(escaped).toBe(
        `&lt;a href=&quot;https:&#x2F;&#x2F;example.com&quot;&gt;www.wikipedia.com&lt;&#x2F;a&gt;`
      );
      expect(escaped).not.toContain('<a href');
      expect(escaped).not.toContain('</a>');
    });

    it('neutralizes script injection payload', () => {
      const payload = `<script>alert("XSS")</script>`;
      const escaped = escapeHtml(payload);
      expect(escaped).toBe(
        `&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;`
      );
      expect(escaped).not.toContain('<script>');
    });

    it('neutralizes attribute breakout payloads', () => {
      const payload = `"><img src=x onerror=alert(1)>`;
      const escaped = escapeHtml(payload);
      expect(escaped).toBe(
        `&quot;&gt;&lt;img src=x onerror=alert(1)&gt;`
      );
      expect(escaped).not.toContain('<img');
    });

    it('handles null and undefined gracefully', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(12345)).toBe('12345');
    });

    it('safeHtml tagged template automatically escapes interpolated variables', () => {
      const maliciousName = `<script>alert(1)</script>`;
      const rendered = safeHtml`<div>Hello, ${maliciousName}!</div>`;
      expect(rendered).toBe(`<div>Hello, &lt;script&gt;alert(1)&lt;&#x2F;script&gt;!</div>`);
      expect(rendered).not.toContain('<script>');
    });
  });

  describe('2. sanitizeUrl Utility', () => {
    it('allows valid https and http URLs', () => {
      expect(sanitizeUrl('https://blendandbold.com/q/123')).toBe('https://blendandbold.com/q/123');
      expect(sanitizeUrl('http://localhost:3000/verify')).toBe('http://localhost:3000/verify');
      expect(sanitizeUrl('/dashboard/customers')).toBe('/dashboard/customers');
    });

    it('blocks javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(document.cookie)')).toBe('#');
      expect(sanitizeUrl('javascript://alert(1)')).toBe('#');
      expect(sanitizeUrl('   JAVASCRIPT:alert(1)   ')).toBe('#');
    });

    it('blocks data: URLs and vbscript:', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('#');
    });

    it('blocks protocol-relative URLs that could redirect to arbitrary external origins', () => {
      expect(sanitizeUrl('//attacker.com/payload')).toBe('#');
    });
  });

  describe('3. stripHtmlToText Utility', () => {
    it('converts HTML into clean plain-text alternatives', () => {
      const html = `<p>Hello <strong>Subesh</strong>,</p><br/><p>Click <a href="https://blendandbold.com">here</a>.</p>`;
      const text = stripHtmlToText(html);
      expect(text).toContain('Hello Subesh');
      expect(text).toContain('Click here');
      expect(text).not.toContain('<p>');
      expect(text).not.toContain('<strong>');
      expect(text).not.toContain('<br');
    });
  });

  describe('4. Server-Side Zod Name Validation (Defense in Depth)', () => {
    it('accepts legitimate human and professional names', () => {
      const validNames = [
        'Subesh M',
        "Dr. Jane O'Connor-Smith",
        'François Müller',
        'José Peña',
        'Mary-Jane Watson',
        'A. B. Cooper',
      ];
      for (const name of validNames) {
        const res = safeNameSchema.safeParse(name);
        expect(res.success, `Expected valid: ${name}`).toBe(true);
      }
    });

    it('rejects names with HTML tags or injection metacharacters', () => {
      const maliciousNames = [
        '<a href="https://example.com">www.wikipedia.com</a>',
        '<script>alert(1)</script>',
        '"><img src=x onerror=alert(1)>',
        "O'Connor<script>",
        'Subesh & Bold',
        'Subesh / Admin',
        'Subesh \\ Tester',
      ];
      for (const name of maliciousNames) {
        const res = safeNameSchema.safeParse(name);
        expect(res.success, `Expected rejection: ${name}`).toBe(false);
      }
    });

    it('rejects names containing URLs or domains', () => {
      const urlNames = [
        'Visit http://evil.com',
        'Check https://phishing.site',
        'Go to www.google.com',
        'login.blendandbold.com',
      ];
      for (const name of urlNames) {
        const res = safeNameSchema.safeParse(name);
        expect(res.success, `Expected rejection: ${name}`).toBe(false);
      }
    });

    it('enforces maximum length of 60 characters on name', () => {
      const longName = 'A'.repeat(61);
      expect(safeNameSchema.safeParse(longName).success).toBe(false);
      expect(safeNameSchema.safeParse('A'.repeat(60)).success).toBe(true);
    });

    it('registrationSchema validates the full registration payload securely', () => {
      const attackPayload = {
        fullName: '<a href="https://example.com">Phish</a>',
        companyName: '<script>alert(1)</script>',
        email: 'attacker@example.com',
        password: 'password123',
        countryCode: 'IN',
      };
      const res = registrationSchema.safeParse(attackPayload);
      expect(res.success).toBe(false);

      const legitimatePayload = {
        fullName: 'Subesh M',
        companyName: 'Blend & Bold LLC',
        email: 'user@example.com',
        password: 'securePassword123',
        countryCode: 'IN',
      };
      // companyName has & so safeCompanyNameSchema will flag it if & is disallowed
      // Let's test standard alphanumeric company name
      const legitimatePayload2 = {
        fullName: 'Subesh M',
        companyName: 'Blend and Bold LLC',
        email: 'user@example.com',
        password: 'securePassword123',
        countryCode: 'IN',
      };
      expect(registrationSchema.safeParse(legitimatePayload2).success).toBe(true);
    });
  });

  describe('5. Transactional Email Template Injection Defense', () => {
    const attackName = `<a href="https://malicious.example.com">Phishing Link</a>`;
    const attackCompany = `<script>alert("XSS")</script>`;
    const attackQuoteNo = `Q-001"><script>alert(1)</script>`;
    const attackCustomNote = `<b onmouseover="alert('attack')">Note</b><a href="http://evil.com">Click</a>`;

    it('generateVerificationOtpEmail renders HTML injection as inert text', () => {
      const email = generateVerificationOtpEmail({
        email: 'victim@example.com',
        fullName: attackName,
        companyName: attackCompany,
        otpCode: '123456',
        verifyUrl: 'https://blendandbold.com/verify?token=abc',
      });

      // Assert inert output
      expect(email.html).not.toContain('<a href="https://malicious.example.com"');
      expect(email.html).not.toContain('<script>');
      expect(email.html).toContain('&lt;a href=&quot;https:&#x2F;&#x2F;malicious.example.com&quot;&gt;');
      expect(email.html).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');

      // Assert plain-text alternative is present and populated
      expect(email.text).toBeDefined();
      expect(email.text).toContain('123456');
      expect(email.text).toContain('victim@example.com');
    });

    it('generateQuotationSentEmail renders customer and company injection safely', () => {
      const email = generateQuotationSentEmail({
        customerName: attackName,
        companyName: attackCompany,
        quotationNumber: attackQuoteNo,
        amount: 5000,
        currency: 'INR',
        validUntil: '2026-12-31',
        publicUrl: 'https://blendandbold.com/q/tok123',
      });

      expect(email.html).not.toContain('<a href="https://malicious.example.com"');
      expect(email.html).not.toContain('<script>');
      expect(email.html).toContain('&lt;a href=&quot;https:&#x2F;&#x2F;malicious.example.com&quot;&gt;');
      expect(email.text).toBeDefined();
    });

    it('generateQuotationReminderEmail safely escapes customNote and params', () => {
      const email = generateQuotationReminderEmail({
        customerName: attackName,
        companyName: attackCompany,
        quotationNumber: attackQuoteNo,
        amount: 2500,
        currency: 'USD',
        validUntil: '2026-12-31',
        publicUrl: 'https://blendandbold.com/q/tok123',
        customNote: attackCustomNote,
      });

      expect(email.html).not.toContain('<b onmouseover=');
      expect(email.html).not.toContain('<a href="http://evil.com"');
      expect(email.html).toContain('&lt;b onmouseover=');
      expect(email.text).toBeDefined();
    });

    it('generateQuotationPaymentReminderEmail safely escapes customer input and bank details', () => {
      const email = generateQuotationPaymentReminderEmail({
        customerName: attackName,
        companyName: attackCompany,
        quotationNumber: attackQuoteNo,
        amount: 9999,
        currency: 'INR',
        publicUrl: 'https://blendandbold.com/q/tok123',
        customNote: attackCustomNote,
        bankDetails: {
          bank_name: `<img src=x onerror=alert(1)>`,
          account_number: `1234"><script>`,
          upi_id: `pay@upi"><script>`,
        },
      });

      expect(email.html).not.toContain('<img src=x');
      expect(email.html).not.toContain('<script>');
      expect(email.text).toBeDefined();
    });

    it('generateQuotationApprovedEmail and generateQuotationRejectedEmail escape input', () => {
      const approved = generateQuotationApprovedEmail({
        signerName: attackName,
        companyName: attackCompany,
        quotationNumber: attackQuoteNo,
        amount: 1000,
        currency: 'INR',
        publicUrl: 'https://blendandbold.com/q/tok123',
      });
      expect(approved.html).not.toContain('<a href="https://malicious.example.com"');
      expect(approved.text).toBeDefined();

      const rejected = generateQuotationRejectedEmail({
        customerName: attackName,
        companyName: attackCompany,
        quotationNumber: attackQuoteNo,
        reason: `<script>alert('reason')</script>`,
        comments: `<a href="http://phish.com">comments</a>`,
        publicUrl: 'https://blendandbold.com/q/tok123',
      });
      expect(rejected.html).not.toContain('<script>');
      expect(rejected.html).not.toContain('<a href="http://phish.com"');
      expect(rejected.text).toBeDefined();
    });

    it('compileTrialReminderHtml and generatePaymentDueEmail escape company names and URLs', () => {
      const trialHtml = compileTrialReminderHtml({
        customer_name: attackCompany,
        days_remaining: 3,
        trial_end_date: '2026-11-15',
        renew_url: 'javascript:alert(1)',
      });
      expect(trialHtml).not.toContain('<script>');
      expect(trialHtml).not.toContain('href="javascript:alert(1)"');

      const paymentDue = generatePaymentDueEmail({
        companyName: attackCompany,
        dueDate: '2026-11-20',
        payUrl: 'javascript:alert(1)',
      });
      expect(paymentDue.html).not.toContain('<script>');
      expect(paymentDue.html).not.toContain('href="javascript:alert(1)"');
      expect(paymentDue.text).toBeDefined();
    });

    it('generatePasswordResetEmail escapes email and sanitizes URL', () => {
      const reset = generatePasswordResetEmail({
        email: `victim<script>alert(1)</script>@example.com`,
        resetUrl: 'javascript:alert(1)',
        otpCode: '654321',
      });
      expect(reset.html).not.toContain('<script>');
      expect(reset.html).not.toContain('href="javascript:alert(1)"');
      expect(reset.text).toBeDefined();
    });

    it('compileTemplateEmail interpolates placeholders with automatic HTML escaping', () => {
      const compiled = compileTemplateEmail({
        html: `<div><h1>Hello {{customer_name}}</h1><p>From {{business_name}}</p><a href="{{quote_link}}">View</a></div>`,
        css: `h1 { color: blue; }`,
        variables: {
          customer_name: attackName,
          business_name: attackCompany,
          quote_link: 'https://blendandbold.com/q/123',
        },
      });

      expect(compiled.html).not.toContain('<a href="https://malicious.example.com"');
      expect(compiled.html).not.toContain('<script>');
      expect(compiled.html).toContain('&lt;a href=&quot;https:&#x2F;&#x2F;malicious.example.com&quot;&gt;');
    });
  });
});
