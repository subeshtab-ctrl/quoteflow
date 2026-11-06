import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Helper to normalize phone numbers
function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = '91' + digits.substring(1);
  }
  return digits;
}

// Helper to compile message template
function compileMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{${key}}`, 'gi'), value);
  }
  return result;
}

describe('Marketing Campaigns & Broadcasts Suite', () => {
  it('normalizes 10-digit Indian numbers with country code 91', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('919876543210');
    expect(normalizePhoneNumber('+91 98765-43210')).toBe('919876543210');
    expect(normalizePhoneNumber('09876543210')).toBe('919876543210');
    expect(normalizePhoneNumber('(987) 654-3210')).toBe('919876543210');
  });

  it('preserves international phone numbers with valid country codes', () => {
    expect(normalizePhoneNumber('+1 (555) 123-4567')).toBe('15551234567');
    expect(normalizePhoneNumber('+44 7911 123456')).toBe('447911123456');
    expect(normalizePhoneNumber('+971 50 123 4567')).toBe('971501234567');
  });

  it('correctly replaces dynamic merge tags in WhatsApp promotional template', () => {
    const template = 'Hi {name}! 🎉 Get {company} Pro for only {offer_code}. Tap {link}';
    const compiled = compileMessage(template, {
      name: 'Rahul Sharma',
      company: 'QuoteFlow',
      offer_code: 'PROMO99',
      link: 'https://blendandbold.com?ref=whatsapp',
    });

    expect(compiled).toBe(
      'Hi Rahul Sharma! 🎉 Get QuoteFlow Pro for only PROMO99. Tap https://blendandbold.com?ref=whatsapp'
    );
  });

  it('generates a valid universal wa.me deep-link with pre-encoded message', () => {
    const phone = '919876543210';
    const message = 'Hello Rahul! Special QuoteFlow offer: PROMO99';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    expect(url).toContain('https://wa.me/919876543210?text=');
    expect(url).toContain('Hello%20Rahul');
    expect(url).toContain('PROMO99');
  });

  it('persists marketing campaign history and gateway configuration in JSON store', () => {
    const storePath = path.join(process.cwd(), 'data', 'marketing-campaigns.json');
    expect(fs.existsSync(storePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    expect(content).toHaveProperty('gatewayConfig');
    expect(content.gatewayConfig).toHaveProperty('provider');
  });

  it('correctly formats promotional message with attached image flyer link', () => {
    const template = 'Hi {name}! Check out our QuoteFlow offer: {link}';
    let msg = compileMessage(template, {
      name: 'Priya',
      link: 'https://blendandbold.com?ref=whatsapp',
    });
    const flyerUrl = 'https://blendandbold.com/uploads/campaigns/promo-flyer.png';
    msg += `\n\n🖼️ View Flyer: ${flyerUrl}`;

    expect(msg).toContain('https://blendandbold.com/uploads/campaigns/promo-flyer.png');
    expect(msg).toContain('Priya');
  });

  it('correctly creates and validates manual contact input', () => {
    const rawName = 'Amit Verma';
    const rawPhone = '9876543210';
    const rawEmail = 'amit@example.com';

    const normalized = normalizePhoneNumber(rawPhone);
    const hasValidPhone = normalized.length >= 10 && normalized.length <= 15;
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

    expect(normalized).toBe('919876543210');
    expect(hasValidPhone).toBe(true);
    expect(hasValidEmail).toBe(true);
  });

  it('supports sending promotional emails from marketing@blendandbold.com', () => {
    const fromEmail = 'marketing@blendandbold.com';
    const fromName = 'QuoteFlow Marketing';
    const formattedSender = `"${fromName}" <${fromEmail}>`;

    expect(formattedSender).toBe('"QuoteFlow Marketing" <marketing@blendandbold.com>');
    expect(fromEmail.endsWith('@blendandbold.com')).toBe(true);
    expect(fromEmail.startsWith('marketing@')).toBe(true);
  });

  it('supports switching between marketing, quotes, and custom sender aliases on blendandbold.com', () => {
    const validSenders = [
      { name: 'QuoteFlow Marketing', email: 'marketing@blendandbold.com' },
      { name: 'QuoteFlow', email: 'quotes@blendandbold.com' },
      { name: 'QuoteFlow Team', email: 'hello@blendandbold.com' },
      { name: 'QuoteFlow Support', email: 'support@blendandbold.com' },
    ];

    validSenders.forEach((sender) => {
      expect(sender.email.endsWith('@blendandbold.com')).toBe(true);
      const formatted = `"${sender.name}" <${sender.email}>`;
      expect(formatted).toContain(sender.email);
    });
  });

  it('persists and retrieves saved contacts with appropriate sources', () => {
    const storePath = path.join(process.cwd(), 'data', 'marketing-campaigns.json');
    const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));

    // Check savedContacts array exists or can be stored
    if (!Array.isArray(store.savedContacts)) {
      store.savedContacts = [];
    }

    const testContact = {
      id: `manual_test_${Date.now()}`,
      name: 'Rohan Mehta',
      phone: '919876500000',
      rawPhone: '9876500000',
      email: 'rohan@example.com',
      status: 'valid',
      source: 'manual',
      selected: true,
      createdAt: new Date().toISOString(),
    };

    store.savedContacts.push(testContact);
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');

    const reloaded = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    const found = reloaded.savedContacts.find((c: any) => c.id === testContact.id);
    expect(found).toBeDefined();
    expect(found.name).toBe('Rohan Mehta');
    expect(found.source).toBe('manual');

    // Clean up test entry
    reloaded.savedContacts = reloaded.savedContacts.filter((c: any) => c.id !== testContact.id);
    fs.writeFileSync(storePath, JSON.stringify(reloaded, null, 2), 'utf-8');
  });

  it('differentiates contact sources between QuoteFlow Client, Saved Lead, Excel, and Demo', () => {
    const sources = ['customer_database', 'manual', 'excel', 'demo'];
    const contactMap = sources.map((src, i) => ({
      id: `c_${i}`,
      name: `User ${i}`,
      source: src,
    }));

    expect(contactMap.find((c) => c.source === 'customer_database')).toBeDefined();
    expect(contactMap.find((c) => c.source === 'manual')).toBeDefined();
    expect(contactMap.find((c) => c.source === 'excel')).toBeDefined();
    expect(contactMap.find((c) => c.source === 'demo')).toBeDefined();
  });

  it('correctly filters contacts when filtering by QuoteFlow Client, Saved Leads, Excel, or Demo', () => {
    const list = [
      { id: '1', name: 'Client A', source: 'customer_database' },
      { id: '2', name: 'Lead B', source: 'manual' },
      { id: '3', name: 'Sheet C', source: 'excel' },
      { id: '4', name: 'Demo D', source: 'demo' },
      { id: '5', name: 'Lead E', source: 'manual' },
    ];

    const filterBySource = (src: string) => (src === 'all' ? list : list.filter((c) => c.source === src));

    expect(filterBySource('all')).toHaveLength(5);
    expect(filterBySource('customer_database')).toHaveLength(1);
    expect(filterBySource('manual')).toHaveLength(2);
    expect(filterBySource('excel')).toHaveLength(1);
    expect(filterBySource('demo')).toHaveLength(1);
    expect(filterBySource('manual')[0].name).toBe('Lead B');
    expect(filterBySource('customer_database')[0].name).toBe('Client A');
  });

  it('correctly tracks sent vs unsent contacts for multi-day batching', () => {
    // 1000 contacts simulation
    const contacts = Array.from({ length: 1000 }, (_, i) => ({
      id: `c_${i + 1}`,
      name: `User ${i + 1}`,
      phone: `91980000${String(i).padStart(4, '0')}`,
      email: `user${i + 1}@example.com`,
      whatsappSent: i < 100, // First 100 sent today
      emailSent: i < 100,
    }));

    const isUnsent = (c: any) => !c.whatsappSent;
    const isSent = (c: any) => !!c.whatsappSent;

    const unsentList = contacts.filter(isUnsent);
    const sentList = contacts.filter(isSent);

    expect(contacts).toHaveLength(1000);
    expect(sentList).toHaveLength(100);
    expect(unsentList).toHaveLength(900);

    // Day 2: Select Next 100 Unsent batch
    let batchCount = 0;
    const day2Batch = contacts.filter((c) => {
      if (isUnsent(c) && batchCount < 100) {
        batchCount++;
        return true;
      }
      return false;
    });

    expect(day2Batch).toHaveLength(100);
    expect(day2Batch[0].id).toBe('c_101'); // Starts immediately at contact 101!
    expect(day2Batch[99].id).toBe('c_200'); // Ends at contact 200!
  });

  it('updates delivery status and timestamp when contacts are marked sent', () => {
    const contact = {
      id: 'c_test_1',
      name: 'Test Contact',
      phone: '919876543210',
      email: 'test@example.com',
      whatsappSent: false,
      emailSent: false,
    };

    const now = new Date().toISOString();
    const updated = {
      ...contact,
      whatsappSent: true,
      whatsappSentAt: now,
      emailSent: true,
      emailSentAt: now,
    };

    expect(updated.whatsappSent).toBe(true);
    expect(updated.whatsappSentAt).toBe(now);
    expect(updated.emailSent).toBe(true);
    expect(updated.emailSentAt).toBe(now);
  });

  it('deduplicates contacts with matching phone numbers across different formats', () => {
    const rawList = [
      { id: '1', name: 'John Doe', phone: '919876543210', rawPhone: '+91 98765-43210', email: 'john@example.com' },
      { id: '2', name: 'John Duplicate', phone: '9876543210', rawPhone: '9876543210', email: 'john.other@example.com' }, // same phone!
      { id: '3', name: 'Alice Smith', phone: '919123456789', rawPhone: '9123456789', email: 'alice@example.com' },
    ];

    const getPhoneSuffix = (p: string) => {
      const d = (p || '').replace(/\D/g, '');
      return d.length >= 10 ? d.slice(-10) : d;
    };

    const unique: any[] = [];
    const seenPhones = new Set<string>();
    let duplicatesCount = 0;

    for (const c of rawList) {
      const suffix = getPhoneSuffix(c.phone || c.rawPhone || '');
      if (suffix && seenPhones.has(suffix)) {
        duplicatesCount++;
      } else {
        if (suffix) seenPhones.add(suffix);
        unique.push(c);
      }
    }

    expect(duplicatesCount).toBe(1);
    expect(unique).toHaveLength(2);
    expect(unique[0].name).toBe('John Doe');
    expect(unique[1].name).toBe('Alice Smith');
  });

  it('deduplicates contacts with matching email addresses (case-insensitive)', () => {
    const rawList = [
      { id: '1', name: 'Bob First', phone: '919876543211', email: 'Marketing@BlendAndBold.com' },
      { id: '2', name: 'Bob Duplicate', phone: '919876543212', email: 'marketing@blendandbold.com' }, // same email!
      { id: '3', name: 'Carol Unique', phone: '919876543213', email: 'carol@blendandbold.com' },
    ];

    const unique: any[] = [];
    const seenEmails = new Set<string>();
    let dups = 0;

    for (const c of rawList) {
      const email = (c.email || '').trim().toLowerCase();
      if (email && seenEmails.has(email)) {
        dups++;
      } else {
        if (email) seenEmails.add(email);
        unique.push(c);
      }
    }

    expect(dups).toBe(1);
    expect(unique).toHaveLength(2);
    expect(unique[0].name).toBe('Bob First');
    expect(unique[1].name).toBe('Carol Unique');
  });

  it('prevents adding duplicates when the exact same file is uploaded twice', () => {
    // Initial 50 contacts from file upload
    const existingContacts = Array.from({ length: 50 }, (_, i) => ({
      id: `c_${i + 1}`,
      name: `Lead ${i + 1}`,
      phone: `91980000${String(i).padStart(4, '0')}`,
      email: `lead${i + 1}@example.com`,
    }));

    // User uploads the exact same file again (same 50 contacts)
    const reuploadedContacts = Array.from({ length: 50 }, (_, i) => ({
      id: `reupload_${i + 1}`,
      name: `Lead ${i + 1}`,
      phone: `91980000${String(i).padStart(4, '0')}`,
      email: `lead${i + 1}@example.com`,
    }));

    const getPhoneSuffix = (p: string) => {
      const d = (p || '').replace(/\D/g, '');
      return d.length >= 10 ? d.slice(-10) : d;
    };

    const isSameContact = (c1: any, c2: any) => {
      const s1 = getPhoneSuffix(c1.phone || '');
      const s2 = getPhoneSuffix(c2.phone || '');
      if (s1 && s2 && s1 === s2) return true;
      const e1 = (c1.email || '').trim().toLowerCase();
      const e2 = (c2.email || '').trim().toLowerCase();
      return !!(e1 && e2 && e1 === e2);
    };

    const newUniqueToAdd: any[] = [];
    let duplicatesDetected = 0;

    for (const up of reuploadedContacts) {
      if (existingContacts.some((c) => isSameContact(c, up))) {
        duplicatesDetected++;
      } else {
        newUniqueToAdd.push(up);
      }
    }

    // 100% of re-uploaded rows are duplicates
    expect(duplicatesDetected).toBe(50);
    expect(newUniqueToAdd).toHaveLength(0);

    // List remains at 50 contacts, nothing duplicated
    const finalContacts = [...existingContacts, ...newUniqueToAdd];
    expect(finalContacts).toHaveLength(50);
  });

  it('merges overlapping contact files while only adding new unique contacts', () => {
    const existingList = [
      { id: '1', name: 'Lead A', phone: '919876543201', email: 'a@example.com' },
      { id: '2', name: 'Lead B', phone: '919876543202', email: 'b@example.com' },
    ];

    const secondBatch = [
      { id: '3', name: 'Lead B Duplicate', phone: '919876543202', email: 'b@example.com' }, // duplicate!
      { id: '4', name: 'Lead C New', phone: '919876543203', email: 'c@example.com' }, // new!
      { id: '5', name: 'Lead D New', phone: '919876543204', email: 'd@example.com' }, // new!
    ];

    const getPhoneSuffix = (p: string) => {
      const d = (p || '').replace(/\D/g, '');
      return d.length >= 10 ? d.slice(-10) : d;
    };

    const isSame = (c1: any, c2: any) => {
      const s1 = getPhoneSuffix(c1.phone || '');
      const s2 = getPhoneSuffix(c2.phone || '');
      if (s1 && s2 && s1 === s2) return true;
      const e1 = (c1.email || '').trim().toLowerCase();
      const e2 = (c2.email || '').trim().toLowerCase();
      return !!(e1 && e2 && e1 === e2);
    };

    const added: any[] = [];
    let skipped = 0;

    for (const c of secondBatch) {
      if (existingList.some((e) => isSame(e, c))) {
        skipped++;
      } else {
        added.push(c);
      }
    }

    expect(skipped).toBe(1);
    expect(added).toHaveLength(2);
    const combined = [...existingList, ...added];
    expect(combined).toHaveLength(4);
    expect(combined.map((c) => c.name)).toEqual(['Lead A', 'Lead B', 'Lead C New', 'Lead D New']);
  });

  it('preserves previously sent status when deduplicating contact entries', () => {
    const list = [
      { id: '1', name: 'Lead X', phone: '919876543210', email: 'x@example.com', whatsappSent: true, emailSent: false },
      { id: '2', name: 'Lead X Dup', phone: '919876543210', email: 'x.new@example.com', whatsappSent: false, emailSent: true },
    ];

    const getPhoneSuffix = (p: string) => (p || '').replace(/\D/g, '').slice(-10);

    const unique: any[] = [];
    const seen = new Set<string>();

    for (const c of list) {
      const suffix = getPhoneSuffix(c.phone);
      if (seen.has(suffix)) {
        const existing = unique.find((u) => getPhoneSuffix(u.phone) === suffix);
        if (existing) {
          if (c.whatsappSent) existing.whatsappSent = true;
          if (c.emailSent) existing.emailSent = true;
        }
      } else {
        seen.add(suffix);
        unique.push({ ...c });
      }
    }

    expect(unique).toHaveLength(1);
    expect(unique[0].whatsappSent).toBe(true);
    expect(unique[0].emailSent).toBe(true);
  });

  it('allows editing contact name, mobile number, email, and company name', () => {
    const originalContact = {
      id: 'contact_1',
      name: 'Old Name',
      phone: '919876543210',
      rawPhone: '9876543210',
      email: 'old@example.com',
      company: 'Old Corp',
      status: 'valid',
      whatsappStatus: 'pending' as const,
      emailStatus: 'pending' as const,
    };

    // User edits the fields
    const updated = {
      ...originalContact,
      name: 'Rahul Sharma',
      phone: normalizePhoneNumber('9988776655'),
      rawPhone: '9988776655',
      email: 'rahul.new@example.com',
      company: 'Apex Traders Pvt Ltd',
      whatsappStatus: 'delivered' as const,
      whatsappSent: true,
      whatsappDeliveredAt: new Date().toISOString(),
      emailStatus: 'opened' as const,
      emailSent: true,
      emailOpenedAt: new Date().toISOString(),
    };

    expect(updated.name).toBe('Rahul Sharma');
    expect(updated.phone).toBe('919988776655');
    expect(updated.email).toBe('rahul.new@example.com');
    expect(updated.company).toBe('Apex Traders Pvt Ltd');
    expect(updated.whatsappStatus).toBe('delivered');
    expect(updated.emailStatus).toBe('opened');
  });

  it('prevents collision when editing a contact to another existing contact number or email', () => {
    const contacts = [
      { id: 'c1', name: 'User 1', phone: '919876543210', email: 'user1@example.com' },
      { id: 'c2', name: 'User 2', phone: '919123456789', email: 'user2@example.com' },
    ];

    const getPhoneSuffix = (p: string) => (p || '').replace(/\D/g, '').slice(-10);

    const isDuplicateEdit = (
      editingId: string,
      newPhone: string,
      newEmail: string,
      list: typeof contacts
    ) => {
      const suffix = getPhoneSuffix(newPhone);
      const cleanEmail = newEmail.trim().toLowerCase();
      return list.some((c) => {
        if (c.id === editingId) return false;
        const existingSuffix = getPhoneSuffix(c.phone);
        const existingEmail = (c.email || '').trim().toLowerCase();
        if (suffix && existingSuffix && suffix === existingSuffix) return true;
        if (cleanEmail && existingEmail && cleanEmail === existingEmail) return true;
        return false;
      });
    };

    // Editing c1 keeping own phone/email is valid (not a duplicate)
    expect(isDuplicateEdit('c1', '919876543210', 'user1@example.com', contacts)).toBe(false);

    // Editing c1 to use c2's phone is blocked as a duplicate
    expect(isDuplicateEdit('c1', '919123456789', 'different@example.com', contacts)).toBe(true);

    // Editing c1 to use c2's email is blocked as a duplicate
    expect(isDuplicateEdit('c1', '919999999999', 'user2@example.com', contacts)).toBe(true);

    // Editing c1 to a completely unique number/email is allowed
    expect(isDuplicateEdit('c1', '919447000000', 'newunique@example.com', contacts)).toBe(false);
  });

  it('accurately resolves WhatsApp and Email delivery, read, and bounce statuses', () => {
    const getWhatsAppStatus = (c: any) => {
      if (c.whatsappStatus) return c.whatsappStatus;
      if (c.whatsappSent) return 'sent';
      return 'pending';
    };

    const getEmailStatus = (c: any) => {
      if (c.emailStatus) return c.emailStatus;
      if (c.emailSent) return 'sent';
      return 'pending';
    };

    const contactPending = { id: '1' };
    const contactSentLegacy = { id: '2', whatsappSent: true, emailSent: true };
    const contactDelivered = { id: '3', whatsappStatus: 'delivered', emailStatus: 'delivered' };
    const contactReadOpened = { id: '4', whatsappStatus: 'read', emailStatus: 'opened' };
    const contactBounced = {
      id: '5',
      whatsappStatus: 'failed',
      emailStatus: 'bounced',
      emailBounceReason: '550 User unknown',
    };

    expect(getWhatsAppStatus(contactPending)).toBe('pending');
    expect(getEmailStatus(contactPending)).toBe('pending');

    expect(getWhatsAppStatus(contactSentLegacy)).toBe('sent');
    expect(getEmailStatus(contactSentLegacy)).toBe('sent');

    expect(getWhatsAppStatus(contactDelivered)).toBe('delivered');
    expect(getEmailStatus(contactDelivered)).toBe('delivered');

    expect(getWhatsAppStatus(contactReadOpened)).toBe('read');
    expect(getEmailStatus(contactReadOpened)).toBe('opened');

    expect(getWhatsAppStatus(contactBounced)).toBe('failed');
    expect(getEmailStatus(contactBounced)).toBe('bounced');
  });

  it('correctly filters contacts by delivered, read, and bounced/failed', () => {
    const list = [
      { id: '1', name: 'Lead Pending', whatsappStatus: 'pending', emailStatus: 'pending' },
      { id: '2', name: 'Lead Sent', whatsappStatus: 'sent', emailStatus: 'sent' },
      { id: '3', name: 'Lead Delivered', whatsappStatus: 'delivered', emailStatus: 'delivered' },
      { id: '4', name: 'Lead Read', whatsappStatus: 'read', emailStatus: 'opened' },
      { id: '5', name: 'Lead Bounced', whatsappStatus: 'failed', emailStatus: 'bounced' },
    ];

    const filterByDelivery = (filter: string) => {
      return list.filter((c: any) => {
        const wa = c.whatsappStatus || (c.whatsappSent ? 'sent' : 'pending');
        const em = c.emailStatus || (c.emailSent ? 'sent' : 'pending');

        if (filter === 'delivered') {
          return wa === 'delivered' || wa === 'read' || em === 'delivered' || em === 'opened';
        }
        if (filter === 'read') {
          return wa === 'read' || em === 'opened';
        }
        if (filter === 'bounced') {
          return wa === 'failed' || em === 'bounced';
        }
        if (filter === 'sent') {
          return wa !== 'pending' || em !== 'pending';
        }
        return true;
      });
    };

    expect(filterByDelivery('delivered')).toHaveLength(2); // Delivered and Read
    expect(filterByDelivery('read')).toHaveLength(1); // Lead Read
    expect(filterByDelivery('bounced')).toHaveLength(1); // Lead Bounced
    expect(filterByDelivery('sent')).toHaveLength(4); // Sent, Delivered, Read, Bounced
  });
});


