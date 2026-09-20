import { NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';

export async function GET() {
  const notifications = await store.getNotifications();
  return NextResponse.json({ success: true, notifications });
}
