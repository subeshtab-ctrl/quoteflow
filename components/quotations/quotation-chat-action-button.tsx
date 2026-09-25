'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

interface QuotationChatActionButtonProps {
  quotationId: string;
  initialHasUnread?: boolean;
  initialUnreadCount?: number;
}

// Shared polling cache so multiple rows share a single request every 3 seconds
let cachedStatusMap: Record<
  string,
  { has_unread_chat: boolean; unread_chat_count: number; chat_count: number }
> | null = null;
let lastFetchTime = 0;
let inflightPromise: Promise<any> | null = null;

async function fetchLiveChatStatusMap() {
  const now = Date.now();
  if (cachedStatusMap && now - lastFetchTime < 2500) {
    return cachedStatusMap;
  }
  if (inflightPromise) {
    return inflightPromise;
  }
  inflightPromise = fetch('/api/quotations/chat-status', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.statusMap) {
        cachedStatusMap = data.statusMap;
        lastFetchTime = Date.now();
      }
      return cachedStatusMap;
    })
    .catch(() => cachedStatusMap)
    .finally(() => {
      inflightPromise = null;
    });
  return inflightPromise;
}

export function QuotationChatActionButton({
  quotationId,
  initialHasUnread = false,
  initialUnreadCount = 0,
}: QuotationChatActionButtonProps) {
  const [hasUnread, setHasUnread] = useState(initialHasUnread);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setHasUnread(initialHasUnread);
    setUnreadCount(initialUnreadCount);
  }, [initialHasUnread, initialUnreadCount]);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const map = await fetchLiveChatStatusMap();
      if (mounted && map && map[quotationId]) {
        setHasUnread(Boolean(map[quotationId].has_unread_chat));
        setUnreadCount(map[quotationId].unread_chat_count || 0);
      }
    };
    const interval = setInterval(poll, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [quotationId]);

  return (
    <Link
      href={`/quotations/${quotationId}#chat`}
      title={
        hasUnread
          ? `New unread customer chat (${unreadCount || 1}) — open quotation to read`
          : 'Open Quotation Chat'
      }
      className={`relative inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors border ${
        hasUnread
          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600'
      }`}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span>Chat</span>
      {hasUnread && (
        <span className="relative flex h-2.5 w-2.5 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
      )}
    </Link>
  );
}
