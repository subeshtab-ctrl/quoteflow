import { NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';

export async function POST() {
  await store.markAllNotificationsRead();
  return NextResponse.json({ success: true });
}
