import fs from 'fs';
import path from 'path';

export interface InvitationRecord {
  token: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'ADMIN';
  organizationId: string;
  companyName: string;
  inviterName: string;
  createdAt: string;
  expiresAt: string;
  accepted: boolean;
}

export function getInvitationsFilePath(): string {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return path.join(dir, 'invitations.json');
}

export function loadInvitations(): Record<string, InvitationRecord> {
  try {
    const p = getInvitationsFilePath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) || {};
    }
  } catch {}
  return {};
}

export function saveInvitation(record: InvitationRecord): void {
  try {
    const all = loadInvitations();
    all[record.token] = record;
    fs.writeFileSync(getInvitationsFilePath(), JSON.stringify(all, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save invitation to file:', err);
  }
}
