import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminActorContext } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

function getCampaignStorePath(): string {
  return path.join(process.cwd(), 'data', 'marketing-campaigns.json');
}

function readCampaignStore() {
  const filePath = getCampaignStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read marketing campaigns store:', err);
  }
  return {
    campaigns: [],
    gatewayConfig: { provider: 'queue' },
    savedContacts: [],
  };
}

function writeCampaignStore(data: any) {
  const filePath = getCampaignStorePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write marketing campaigns store:', err);
    return false;
  }
}

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

export async function GET(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const campaignStore = readCampaignStore();
    const manualSavedContacts = Array.isArray(campaignStore.savedContacts) ? campaignStore.savedContacts : [];

    // Also load QuoteFlow registered customers
    let systemCustomers: any[] = [];
    try {
      const custs = await store.getCustomers('a0000000-0000-0000-0000-000000000001', {
        environment: 'ALL',
        includeDemo: true,
      });

      if (Array.isArray(custs)) {
        systemCustomers = custs.map((c) => {
          const rawPhone = c.phone || '';
          const phone = normalizePhoneNumber(rawPhone);
          const rawEmail = (c.email || '').trim().toLowerCase();
          const hasValidPhone = phone.length >= 10 && phone.length <= 15;
          const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

          let status: 'valid' | 'whatsapp_only' | 'email_only' | 'invalid' = 'invalid';
          if (hasValidPhone && hasValidEmail) status = 'valid';
          else if (hasValidPhone) status = 'whatsapp_only';
          else if (hasValidEmail) status = 'email_only';

          return {
            id: `sys_cust_${c.id}`,
            name: c.name || c.company_name || 'Valued Client',
            company: c.company_name || '',
            email: hasValidEmail ? rawEmail : '',
            phone: hasValidPhone ? phone : '',
            rawPhone,
            status,
            source: 'customer_database',
            selected: status !== 'invalid',
          };
        });
      }
    } catch (e) {
      console.warn('Could not fetch system customers:', e);
    }

    // Merge manual contacts and system customers (deduplicate by phone or email)
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const combinedContacts: any[] = [];

    // 1. Prioritize manually added contacts
    for (const c of manualSavedContacts) {
      if (c.phone) seenPhones.add(c.phone);
      if (c.email) seenEmails.add(c.email);
      combinedContacts.push({
        ...c,
        source: c.source || 'manual',
        selected: c.selected !== false,
      });
    }

    // 2. Add system customers that aren't already added
    for (const c of systemCustomers) {
      const isDuplicate = (c.phone && seenPhones.has(c.phone)) || (c.email && seenEmails.has(c.email));
      if (!isDuplicate) {
        if (c.phone) seenPhones.add(c.phone);
        if (c.email) seenEmails.add(c.email);
        combinedContacts.push(c);
      }
    }

    return NextResponse.json({
      success: true,
      contacts: combinedContacts,
      uploadedContacts: Array.isArray(campaignStore.uploadedContacts) ? campaignStore.uploadedContacts : [],
      uploadedFileName: campaignStore.uploadedFileName || '',
      manualCount: manualSavedContacts.length,
      systemCustomerCount: systemCustomers.length,
      totalCount: combinedContacts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const body = await req.json();

    // 1. Bulk Upload Action with Strict Deduplication
    if (body.action === 'bulk_upload') {
      const { contacts, fileName } = body;
      const campaignStore = readCampaignStore();
      let uniqueContacts: any[] = [];
      let duplicatesRemoved = 0;

      if (Array.isArray(contacts)) {
        const seenPhones = new Set<string>();
        const seenEmails = new Set<string>();

        for (const c of contacts) {
          const phone = normalizePhoneNumber(c.phone || c.rawPhone || '');
          const phoneLast10 = phone.length >= 10 ? phone.slice(-10) : phone;
          const email = (c.email || '').trim().toLowerCase();
          const isDup = (phoneLast10 && seenPhones.has(phoneLast10)) || (email && seenEmails.has(email));

          if (isDup) {
            duplicatesRemoved++;
            const existing = uniqueContacts.find((u) => {
              const uPhone = (u.phone || '').replace(/\D/g, '');
              const uPhoneLast10 = uPhone.length >= 10 ? uPhone.slice(-10) : uPhone;
              const uEmail = (u.email || '').trim().toLowerCase();
              return (phoneLast10 && uPhoneLast10 === phoneLast10) || (email && uEmail === email);
            });
            if (existing) {
              if (c.whatsappSent && !existing.whatsappSent) {
                existing.whatsappSent = true;
                existing.whatsappSentAt = c.whatsappSentAt || existing.whatsappSentAt;
              }
              if (c.emailSent && !existing.emailSent) {
                existing.emailSent = true;
                existing.emailSentAt = c.emailSentAt || existing.emailSentAt;
              }
            }
          } else {
            if (phoneLast10) seenPhones.add(phoneLast10);
            if (email) seenEmails.add(email);
            uniqueContacts.push({
              ...c,
              phone: phone || c.phone || '',
              email,
            });
          }
        }

        campaignStore.uploadedContacts = uniqueContacts;
        if (fileName) campaignStore.uploadedFileName = fileName;
        writeCampaignStore(campaignStore);
      }

      return NextResponse.json({
        success: true,
        count: uniqueContacts.length,
        duplicatesRemoved,
      });
    }

    // 2. Update Contact Details (Name, Phone, Email, Company, Delivery/Read/Bounce Status)
    if (body.action === 'update_contact') {
      const { id, name, phone: rawPhone, email: rawEmail, company, whatsappStatus, emailStatus, emailBounceReason } = body;
      if (!id) {
        return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
      }

      const campaignStore = readCampaignStore();
      const phone = normalizePhoneNumber(rawPhone || '');
      const cleanEmail = (rawEmail || '').trim().toLowerCase();
      const cleanName = (name || '').trim();
      const cleanCompany = (company || '').trim();

      const hasValidPhone = phone.length >= 10 && phone.length <= 15;
      const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

      let status: 'valid' | 'whatsapp_only' | 'email_only' | 'invalid' = 'invalid';
      if (hasValidPhone && hasValidEmail) status = 'valid';
      else if (hasValidPhone) status = 'whatsapp_only';
      else if (hasValidEmail) status = 'email_only';

      const updateItem = (c: any) => {
        if (c.id !== id) return c;
        const updated = {
          ...c,
          name: cleanName || c.name,
          phone: hasValidPhone ? phone : (cleanName ? '' : c.phone),
          rawPhone: rawPhone !== undefined ? rawPhone : c.rawPhone,
          email: hasValidEmail ? cleanEmail : (cleanName ? '' : c.email),
          company: cleanCompany,
          status,
          updatedAt: new Date().toISOString(),
        };

        if (whatsappStatus) {
          updated.whatsappStatus = whatsappStatus;
          updated.whatsappSent = whatsappStatus !== 'pending';
          if (whatsappStatus === 'delivered' || whatsappStatus === 'read') {
            updated.whatsappDeliveredAt = updated.whatsappDeliveredAt || new Date().toISOString();
          }
          if (whatsappStatus === 'read') {
            updated.whatsappReadAt = updated.whatsappReadAt || new Date().toISOString();
          }
        }

        if (emailStatus) {
          updated.emailStatus = emailStatus;
          updated.emailSent = emailStatus !== 'pending';
          if (emailStatus === 'delivered' || emailStatus === 'opened') {
            updated.emailDeliveredAt = updated.emailDeliveredAt || new Date().toISOString();
          }
          if (emailStatus === 'opened') {
            updated.emailOpenedAt = updated.emailOpenedAt || new Date().toISOString();
          }
          if (emailStatus === 'bounced') {
            updated.emailBouncedAt = updated.emailBouncedAt || new Date().toISOString();
            updated.emailBounceReason = emailBounceReason || 'Recipient address mailbox rejected or unreachable';
          }
        }

        return updated;
      };

      campaignStore.savedContacts = (campaignStore.savedContacts || []).map(updateItem);
      campaignStore.uploadedContacts = (campaignStore.uploadedContacts || []).map(updateItem);
      writeCampaignStore(campaignStore);

      return NextResponse.json({
        success: true,
        message: 'Contact updated successfully',
      });
    }

    // 3. Mark Sent Status Action (WhatsApp / Email)
    if (body.action === 'mark_sent') {
      const { contactIds, channel } = body;
      const idsSet = new Set(Array.isArray(contactIds) ? contactIds : [contactIds]);
      const nowIso = new Date().toISOString();
      const campaignStore = readCampaignStore();

      const updateList = (list: any[]) =>
        list.map((c) => {
          if (!idsSet.has(c.id)) return c;
          const updated = { ...c };
          if (channel === 'whatsapp' || channel === 'both') {
            updated.whatsappSent = true;
            updated.whatsappSentAt = nowIso;
          }
          if (channel === 'email' || channel === 'both') {
            updated.emailSent = true;
            updated.emailSentAt = nowIso;
          }
          return updated;
        });

      campaignStore.savedContacts = updateList(campaignStore.savedContacts || []);
      campaignStore.uploadedContacts = updateList(campaignStore.uploadedContacts || []);
      writeCampaignStore(campaignStore);

      return NextResponse.json({
        success: true,
        updatedCount: idsSet.size,
      });
    }

    // 3. Reset Delivery Status Action
    if (body.action === 'reset_status') {
      const { channel } = body;
      const campaignStore = readCampaignStore();

      const resetList = (list: any[]) =>
        list.map((c) => {
          const updated = { ...c };
          if (!channel || channel === 'whatsapp' || channel === 'all') {
            delete updated.whatsappSent;
            delete updated.whatsappSentAt;
          }
          if (!channel || channel === 'email' || channel === 'all') {
            delete updated.emailSent;
            delete updated.emailSentAt;
          }
          return updated;
        });

      campaignStore.savedContacts = resetList(campaignStore.savedContacts || []);
      campaignStore.uploadedContacts = resetList(campaignStore.uploadedContacts || []);
      writeCampaignStore(campaignStore);

      return NextResponse.json({ success: true });
    }

    // 4. Default: Single Manual Contact Add
    const { name, phone: rawPhone, email: rawEmail, company } = body;

    const cleanName = (name || '').trim();
    const phone = normalizePhoneNumber(rawPhone || '');
    const cleanEmail = (rawEmail || '').trim().toLowerCase();

    const hasValidPhone = phone.length >= 10 && phone.length <= 15;
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!hasValidPhone && !hasValidEmail) {
      return NextResponse.json(
        { error: 'Please provide at least a valid phone number (10+ digits) or a valid email address.' },
        { status: 400 }
      );
    }

    let status: 'valid' | 'whatsapp_only' | 'email_only' = 'valid';
    if (hasValidPhone && hasValidEmail) status = 'valid';
    else if (hasValidPhone) status = 'whatsapp_only';
    else if (hasValidEmail) status = 'email_only';

    const newContact = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName || (hasValidPhone ? `User ${phone.slice(-4)}` : 'Valued Customer'),
      company: (company || '').trim(),
      email: hasValidEmail ? cleanEmail : '',
      phone: hasValidPhone ? phone : '',
      rawPhone: rawPhone || '',
      status,
      source: 'manual',
      selected: true,
      createdAt: new Date().toISOString(),
      createdBy: actor.email || 'developer_admin',
    };

    const campaignStore = readCampaignStore();
    const currentSaved = Array.isArray(campaignStore.savedContacts) ? campaignStore.savedContacts : [];

    // Avoid duplicate phone (comparing last 10 digits) or duplicate email
    const newPhoneDigits = newContact.phone.replace(/\D/g, '');
    const newPhoneLast10 = newPhoneDigits.length >= 10 ? newPhoneDigits.slice(-10) : newPhoneDigits;
    const newEmailLower = (newContact.email || '').trim().toLowerCase();

    const exists = currentSaved.some((c: any) => {
      const cPhoneDigits = (c.phone || c.rawPhone || '').replace(/\D/g, '');
      const cPhoneLast10 = cPhoneDigits.length >= 10 ? cPhoneDigits.slice(-10) : cPhoneDigits;
      const cEmailLower = (c.email || '').trim().toLowerCase();
      if (newPhoneLast10 && cPhoneLast10 && newPhoneLast10 === cPhoneLast10) return true;
      if (newEmailLower && cEmailLower && newEmailLower === cEmailLower) return true;
      return false;
    });

    if (exists) {
      return NextResponse.json(
        { error: 'A contact with this phone number or email address already exists in your saved contacts.' },
        { status: 409 }
      );
    }

    campaignStore.savedContacts = [newContact, ...currentSaved];
    writeCampaignStore(campaignStore);

    return NextResponse.json({
      success: true,
      contact: newContact,
      savedContactsCount: campaignStore.savedContacts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const campaignStore = readCampaignStore();
    const currentSaved = Array.isArray(campaignStore.savedContacts) ? campaignStore.savedContacts : [];
    campaignStore.savedContacts = currentSaved.filter((c: any) => c.id !== id);
    writeCampaignStore(campaignStore);

    return NextResponse.json({
      success: true,
      remainingCount: campaignStore.savedContacts.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
