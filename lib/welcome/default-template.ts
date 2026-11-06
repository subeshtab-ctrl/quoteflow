import { WelcomeTemplateConfig, WelcomeTemplateVersion, AIWelcomeConfig } from './types';

export const DEFAULT_WELCOME_CONFIG: WelcomeTemplateConfig = {
  heading: 'Welcome to QuoteFlow, {{owner_name}}! 👋',
  subtitle:
    'Your business now has a smarter way to create quotes, follow opportunities, manage customers and get paid.',
  heroTitle: 'Create Quotes. Win Customers. Get Paid.',
  heroDescription:
    'QuoteFlow brings your quoting, customers, invoices, payments and business intelligence together in one simple workspace. Your 14-day Pro trial is now active.',
  primaryCtaText: 'Create Your First Quote',
  primaryCtaUrl: '{{create_quote_url}}',
  secondaryCtaText: 'Open Dashboard',
  secondaryCtaUrl: '{{dashboard_url}}',
  aiTitle: 'Meet QuoteFlow AI ✨',
  aiDescription:
    'QuoteFlow AI is more than a quote creator. It can help you understand your business, find what needs attention and decide what to do next.',
  aiCtaText: 'Try QuoteFlow AI',
  aiCtaUrl: '{{ai_url}}',
  trialCardTitle: 'Your Pro Trial Is Active 🎉',
  trialCardDescription:
    'Explore QuoteFlow during your trial and see how it fits your business workflow. Enjoy unrestricted access to all Pro features with zero commitment.',
  supportTitle: 'Need Help?',
  supportDescription:
    "We're here if you need help getting started or setting up your team.",
  supportEmail: 'hello@blendandbold.com',
  supportCtaText: 'Get Help',
  supportCtaUrl: '{{help_url}}',
  footerText:
    "You're receiving this email because a QuoteFlow account was created for {{business_name}}.",
};

export const DEFAULT_AI_WELCOME_CONFIG: AIWelcomeConfig = {
  enabled: true,
  greeting: 'Hi {{owner_name}} 👋',
  description:
    "Welcome to QuoteFlow AI. I'm here to help you create quotes, understand your customers, follow opportunities and keep your business moving.",
  suggestions: [
    {
      id: 'sugg_1',
      label: 'Create my first quote',
      action: 'CREATE_FIRST_QUOTE',
      prompt: 'Help me create my first quote',
      subtitle: 'Draft a quotation using natural language in seconds',
      icon: 'file-text',
    },
    {
      id: 'sugg_2',
      label: 'Help set up my business',
      action: 'SETUP_BUSINESS',
      prompt: 'Help me set up my business profile and settings',
      subtitle: 'Configure logo, tax, currency, and payment terms',
      icon: 'settings',
    },
    {
      id: 'sugg_3',
      label: 'What can QuoteFlow AI do?',
      action: 'EXPLAIN_QUOTEFLOW',
      prompt: 'What can QuoteFlow AI do for my business?',
      subtitle: 'Explore quoting, analytics, and growth capabilities',
      icon: 'sparkles',
    },
    {
      id: 'sugg_4',
      label: 'Add my first customer',
      action: 'ADD_CUSTOMER',
      prompt: 'I want to add a customer to my workspace',
      subtitle: 'Add contact details and save for fast quote generation',
      icon: 'users',
    },
  ],
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_WELCOME_CSS = `
  body {
    margin: 0;
    padding: 0;
    background-color: #f4f6f8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    -webkit-font-smoothing: antialiased;
  }
  table {
    border-spacing: 0;
    border-collapse: collapse;
  }
  td {
    padding: 0;
  }
  img {
    border: 0;
  }
  .wrapper {
    width: 100%;
    table-layout: fixed;
    background-color: #f4f6f8;
    padding: 30px 0;
  }
  .main-table {
    background-color: #ffffff;
    margin: 0 auto;
    width: 100%;
    max-width: 600px;
    border-radius: 18px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
  }
  .header-pad {
    padding: 32px 36px 20px 36px;
  }
  .content-pad {
    padding: 0 36px 28px 36px;
  }
  .card-box {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 20px;
  }
  .ai-card {
    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    border: 1px solid #ddd6fe;
    border-radius: 16px;
    padding: 24px;
  }
  .dialog-bubble-user {
    background-color: #4f46e5;
    color: #ffffff;
    padding: 10px 14px;
    border-radius: 12px 12px 2px 12px;
    font-size: 13px;
    line-height: 1.4;
    display: inline-block;
    max-width: 85%;
  }
  .dialog-bubble-ai {
    background-color: #ffffff;
    color: #1e1b4b;
    border: 1px solid #e0e7ff;
    padding: 12px 14px;
    border-radius: 12px 12px 12px 2px;
    font-size: 13px;
    line-height: 1.45;
    display: inline-block;
    max-width: 90%;
    box-shadow: 0 2px 4px rgba(79, 70, 229, 0.04);
  }
  .btn-primary {
    background-color: #4f46e5;
    color: #ffffff !important;
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
    padding: 13px 26px;
    border-radius: 10px;
    display: inline-block;
  }
  .btn-secondary {
    background-color: #ffffff;
    color: #4338ca !important;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
    padding: 11px 20px;
    border-radius: 8px;
    display: inline-block;
    border: 1px solid #cbd5e1;
  }
  .btn-ai {
    background-color: #6366f1;
    color: #ffffff !important;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 20px;
    border-radius: 8px;
    display: inline-block;
  }
  .feature-cell {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
    vertical-align: top;
  }
  .workflow-step {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: #4338ca;
  }
  @media only screen and (max-width: 620px) {
    .wrapper {
      padding: 10px 0 !important;
    }
    .main-table {
      width: 100% !important;
      border-radius: 0 !important;
      border-left: none !important;
      border-right: none !important;
    }
    .header-pad, .content-pad {
      padding-left: 20px !important;
      padding-right: 20px !important;
    }
    .stack-column {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      margin-bottom: 10px !important;
    }
    .btn-primary {
      display: block !important;
      width: 100% !important;
      text-align: center !important;
      box-sizing: border-box !important;
    }
    .dialog-bubble-user, .dialog-bubble-ai {
      max-width: 95% !important;
    }
  }
`.trim();

export const DEFAULT_WELCOME_HTML = `
<!-- PREHEADER HIDDEN TEXT FOR INBOX PREVIEW -->
<div style="display: none; font-size: 1px; color: #f4f6f8; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
  Create quotes faster, follow opportunities, manage customers and get paid with QuoteFlow.
</div>

<center class="wrapper">
  <table role="presentation" class="main-table" align="center">
    
    <!-- BRAND TOP BAR -->
    <tr>
      <td style="background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%); height: 5px;"></td>
    </tr>

    <!-- HEADER / LOGO & GREETING -->
    <tr>
      <td class="header-pad">
        <table role="presentation" width="100%">
          <tr>
            <td>
              <table role="presentation">
                <tr>
                  <td style="vertical-align: middle;">
                    <!-- QuoteFlow Styled Icon -->
                    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); width: 44px; height: 44px; border-radius: 12px; text-align: center; line-height: 44px; color: #ffffff; font-size: 24px; font-weight: 900; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);">
                      Q
                    </div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <div style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                      QuoteFlow
                    </div>
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                      Business Operator Platform
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" style="vertical-align: middle;">
              <span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; border: 1px solid #e2e8f0;">
                {{business_name}}
              </span>
            </td>
          </tr>
        </table>

        <!-- GREETING & INTRO -->
        <div style="margin-top: 24px;">
          <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; line-height: 1.25; letter-spacing: -0.5px;">
            Welcome to QuoteFlow, {{owner_name}}! 👋
          </h1>
          <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.55;">
            Your business now has a smarter way to create quotes, follow opportunities, manage customers and get paid.
          </p>
        </div>
      </td>
    </tr>

    <!-- HERO SECTION -->
    <tr>
      <td class="content-pad">
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); border: 1px solid #e0e7ff; border-radius: 14px; padding: 24px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 6px;">
            Workspace Ready
          </div>
          <h2 style="font-size: 20px; font-weight: 900; color: #1e1b4b; margin: 0 0 10px 0; line-height: 1.3;">
            Create Quotes. Win Customers. Get Paid.
          </h2>
          <p style="font-size: 13px; color: #475569; margin: 0 0 18px 0; line-height: 1.6;">
            QuoteFlow brings your quoting, customers, invoices, payments and business intelligence together in one simple workspace. Your 14-day Pro trial is now active.
          </p>

          <!-- CTAs -->
          <table role="presentation">
            <tr>
              <td>
                <a href="{{create_quote_url}}" class="btn-primary" target="_blank">
                  Create Your First Quote &rarr;
                </a>
              </td>
              <td style="padding-left: 12px;">
                <a href="{{dashboard_url}}" class="btn-secondary" target="_blank">
                  Open Dashboard
                </a>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- QUOTEFLOW AI CARD WITH REAL DIALOGUE EXAMPLES -->
    <tr>
      <td class="content-pad">
        <div class="ai-card">
          <table role="presentation" width="100%">
            <tr>
              <td>
                <div style="display: inline-block; background-color: #818cf8; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 6px; margin-bottom: 8px;">
                  AI Business Operator
                </div>
                <h3 style="font-size: 18px; font-weight: 900; color: #1e1b4b; margin: 0 0 6px 0;">
                  Meet QuoteFlow AI ✨
                </h3>
                <p style="font-size: 13px; color: #4338ca; margin: 0 0 18px 0; line-height: 1.5;">
                  QuoteFlow AI is more than a quote creator. It can help you understand your business, find what needs attention and decide what to do next.
                </p>
              </td>
            </tr>
          </table>

          <!-- SIMULATED CONVERSATION 1 -->
          <div style="background-color: rgba(255, 255, 255, 0.7); border: 1px solid #c7d2fe; border-radius: 12px; padding: 14px; margin-bottom: 12px;">
            <div style="text-align: right; margin-bottom: 8px;">
              <div class="dialog-bubble-user">
                <strong>You:</strong> Create a quote for ABC Solar — 10 batteries at $300 each + installation $500.
              </div>
            </div>
            <div style="text-align: left;">
              <div class="dialog-bubble-ai">
                <span style="color: #4f46e5; font-weight: 800;">✨ QuoteFlow AI:</span> Your quote draft is ready.<br>
                <div style="margin-top: 6px; padding: 8px 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 12px;">
                  <strong>ABC Solar</strong><br>
                  • 10 &times; Battery $3,000<br>
                  • Installation $500<br>
                  <span style="color: #059669; font-weight: 700;">Total: $3,500</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SIMULATED CONVERSATION 2 -->
          <div style="background-color: rgba(255, 255, 255, 0.7); border: 1px solid #c7d2fe; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
            <div style="text-align: right; margin-bottom: 8px;">
              <div class="dialog-bubble-user">
                <strong>You:</strong> What should I do today?
              </div>
            </div>
            <div style="text-align: left;">
              <div class="dialog-bubble-ai">
                <span style="color: #4f46e5; font-weight: 800;">✨ QuoteFlow AI:</span> Here are your top priorities:<br>
                • <strong>4 quotes</strong> need follow-up. Potential value: <strong>$8,450</strong><br>
                • <strong>3 invoices</strong> are overdue. Outstanding: <strong>$2,100</strong>
              </div>
            </div>
          </div>

          <!-- AI CTA -->
          <div style="text-align: center;">
            <a href="{{ai_url}}" class="btn-ai" target="_blank">
              Try QuoteFlow AI &rarr;
            </a>
          </div>
        </div>
      </td>
    </tr>

    <!-- SIMPLE WORKFLOW: FROM OPPORTUNITY TO PAYMENT -->
    <tr>
      <td class="content-pad">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; text-align: center;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px;">
            The Complete Flow
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0;">
            From Opportunity to Payment
          </h3>

          <!-- Workflow Steps Table -->
          <table role="presentation" width="100%">
            <tr>
              <td class="workflow-step">CUSTOMER</td>
              <td style="color: #94a3b8; font-size: 11px;">&rarr;</td>
              <td class="workflow-step">QUOTE</td>
              <td style="color: #94a3b8; font-size: 11px;">&rarr;</td>
              <td class="workflow-step">VIEWS</td>
              <td style="color: #94a3b8; font-size: 11px;">&rarr;</td>
              <td class="workflow-step">APPROVAL</td>
              <td style="color: #94a3b8; font-size: 11px;">&rarr;</td>
              <td class="workflow-step">INVOICE</td>
              <td style="color: #94a3b8; font-size: 11px;">&rarr;</td>
              <td class="workflow-step" style="color: #059669;">PAYMENT</td>
            </tr>
          </table>

          <p style="font-size: 12px; color: #64748b; margin: 14px 0 0 0;">
            QuoteFlow keeps the entire journey organized in one place.
          </p>
        </div>
      </td>
    </tr>

    <!-- FEATURES GRID (10 CARDS) -->
    <tr>
      <td class="content-pad">
        <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 0 0 14px 0;">
          Everything You Need to Keep Business Moving
        </h3>

        <table role="presentation" width="100%">
          <tr>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">⚡ Smart Quotes</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Create professional quotes quickly and manage them from one place.</div>
            </td>
            <td width="4%" class="stack-column"></td>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">✨ QuoteFlow AI</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Create quotes using natural language and get useful business assistance.</div>
            </td>
          </tr>
          <tr><td height="10" colspan="3"></td></tr>
          <tr>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">👀 Quote Tracking</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Know when customers view your quotes and keep track of pending opportunities.</div>
            </td>
            <td width="4%" class="stack-column"></td>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">✅ Customer Approvals</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Let customers review and approve quotations online with digital signatures.</div>
            </td>
          </tr>
          <tr><td height="10" colspan="3"></td></tr>
          <tr>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">🧾 Invoices</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Turn approved work into professional tax invoices in one click.</div>
            </td>
            <td width="4%" class="stack-column"></td>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">💰 Payment Tracking</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Track paid, partially paid and outstanding balances effortlessly.</div>
            </td>
          </tr>
          <tr><td height="10" colspan="3"></td></tr>
          <tr>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">👥 Customers</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Keep customer details, quote history and business activity organized.</div>
            </td>
            <td width="4%" class="stack-column"></td>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">📊 Business Insights</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Understand approvals, pending quotes, payments and revenue performance.</div>
            </td>
          </tr>
          <tr><td height="10" colspan="3"></td></tr>
          <tr>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">🎯 Leads</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Manage prospects, follow up proactively and turn opportunities into customers.</div>
            </td>
            <td width="4%" class="stack-column"></td>
            <td width="48%" class="stack-column feature-cell">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 4px;">👨‍💼 Team &amp; Staff</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.45;">Add staff members, assign roles and granular permission controls safely.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- 3-MINUTE GETTING STARTED SECTION -->
    <tr>
      <td class="content-pad">
        <div style="background-color: #f1f5f9; border-radius: 14px; padding: 22px;">
          <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 0 0 14px 0;">
            Get Started in 3 Minutes
          </h3>

          <table role="presentation" width="100%">
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="background-color: #4f46e5; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 800;">1</div>
              </td>
              <td style="vertical-align: top; padding-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Add Your Business Details</div>
                <div style="font-size: 12px; color: #475569;">Add your logo, tax settings, currency and payment information.</div>
              </td>
            </tr>
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="background-color: #4f46e5; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 800;">2</div>
              </td>
              <td style="vertical-align: top; padding-bottom: 12px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Create Your First Quote</div>
                <div style="font-size: 12px; color: #475569;">Create manually or simply tell QuoteFlow AI what you want to quote.</div>
              </td>
            </tr>
            <tr>
              <td style="vertical-align: top; width: 32px;">
                <div style="background-color: #4f46e5; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 800;">3</div>
              </td>
              <td style="vertical-align: top;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Send It</div>
                <div style="font-size: 12px; color: #475569;">Share the quote via WhatsApp or email and track its progress in real-time.</div>
              </td>
            </tr>
          </table>

          <div style="margin-top: 18px; text-align: center;">
            <a href="{{create_quote_url}}" class="btn-primary" target="_blank">
              Create My First Quote &rarr;
            </a>
          </div>
        </div>
      </td>
    </tr>

    <!-- TRIAL CARD -->
    <tr>
      <td class="content-pad">
        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #bbf7d0; border-radius: 14px; padding: 22px;">
          <table role="presentation" width="100%">
            <tr>
              <td>
                <div style="font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">
                  Active Subscription
                </div>
                <h3 style="font-size: 17px; font-weight: 900; color: #14532d; margin: 4px 0 6px 0;">
                  Your Pro Trial Is Active 🎉
                </h3>
                <p style="font-size: 13px; color: #166534; margin: 0 0 14px 0; line-height: 1.5;">
                  Explore QuoteFlow during your trial and see how it fits your business workflow.
                </p>
                <table role="presentation">
                  <tr>
                    <td style="padding-right: 18px;">
                      <div style="font-size: 11px; color: #15803d; font-weight: 600;">Plan</div>
                      <div style="font-size: 13px; font-weight: 800; color: #14532d;">{{plan_name}}</div>
                    </td>
                    <td style="padding-right: 18px;">
                      <div style="font-size: 11px; color: #15803d; font-weight: 600;">Trial Duration</div>
                      <div style="font-size: 13px; font-weight: 800; color: #14532d;">{{trial_days}} Days</div>
                    </td>
                    <td>
                      <div style="font-size: 11px; color: #15803d; font-weight: 600;">Expires On</div>
                      <div style="font-size: 13px; font-weight: 800; color: #14532d;">{{trial_end_date}}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- MOBILE MESSAGE & SUPPORT -->
    <tr>
      <td class="content-pad">
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size: 12px; color: #64748b; line-height: 1.55;">
                📱 <strong>Work Anywhere:</strong> QuoteFlow is designed to work smoothly on mobile, tablet and desktop. Create quotes, check customers and use QuoteFlow AI wherever you're working.
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" style="margin-top: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
            <tr>
              <td style="font-size: 13px; color: #334155;">
                <strong>Need Help?</strong> We're here if you need assistance getting started.<br>
                Contact: <a href="mailto:{{support_email}}" style="color: #4f46e5; font-weight: 600;">{{support_email}}</a>
              </td>
              <td align="right" style="vertical-align: middle;">
                <a href="{{help_url}}" class="btn-secondary" style="font-size: 12px; padding: 8px 14px;" target="_blank">
                  Get Help
                </a>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
        <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; line-height: 1.5;">
          You're receiving this email because a QuoteFlow account was created for <strong>{{business_name}}</strong>.
        </p>
        <p style="font-size: 11px; color: #94a3b8; margin: 0 0 10px 0;">
          QuoteFlow &bull; Create Quotes With AI. Get Approved. Get Paid.
        </p>
        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
          &copy; 2026 QuoteFlow Inc. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</center>
`.trim();

export function createDefaultWelcomeTemplateVersion(): WelcomeTemplateVersion {
  return {
    id: 'tmpl_welcome_v1',
    version: 1,
    status: 'PUBLISHED',
    subject: 'Welcome to QuoteFlow 🎉 — Your AI Business Assistant Is Ready',
    preheader:
      'Create quotes faster, follow opportunities, manage customers and get paid with QuoteFlow.',
    senderName: 'QuoteFlow',
    replyTo: 'hello@blendandbold.com',
    html: DEFAULT_WELCOME_HTML,
    css: DEFAULT_WELCOME_CSS,
    config: DEFAULT_WELCOME_CONFIG,
    createdAt: new Date().toISOString(),
    createdBy: 'system_default',
    publishedAt: new Date().toISOString(),
    publishedBy: 'system_default',
  };
}
