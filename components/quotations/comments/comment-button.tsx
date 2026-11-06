'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { QuotationCommentNotificationStatus } from '@/types/staff-comment';
import { StaffCommentPopover } from './staff-comment-popover';

interface CommentButtonProps {
  quotationId: string;
  quotationNumber: string;
  className?: string;
  initialStatus?: QuotationCommentNotificationStatus;
}

export function CommentButton({
  quotationId,
  quotationNumber,
  className = '',
  initialStatus,
}: CommentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<QuotationCommentNotificationStatus>(
    initialStatus || {
      hasUnread: false,
      hasUnreadMention: false,
      unreadCount: 0,
      unreadMentionCount: 0,
    }
  );

  // Fetch initial unread notification status
  useEffect(() => {
    let isMounted = true;
    const checkNotificationStatus = async () => {
      try {
        const res = await fetch(`/api/quotations/${quotationId}/comments`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.notificationStatus) {
          setStatus(data.notificationStatus);
        }
      } catch {}
    };

    checkNotificationStatus();
    // Re-check periodically every 15s when closed
    const timer = setInterval(checkNotificationStatus, 15000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [quotationId]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group relative inline-flex items-center gap-1.5 h-[28px] sm:h-[30px] px-2.5 sm:px-3 text-[11px] font-semibold rounded-lg border transition-all duration-150 cursor-pointer select-none shadow-2xs hover:shadow-xs focus:outline-hidden ${
          isOpen
            ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
            : status.hasUnreadMention
            ? 'bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 ring-2 ring-indigo-400/20'
            : status.hasUnread
            ? 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300'
        } ${className}`}
        title={
          status.hasUnreadMention
            ? 'You were mentioned in an unread staff comment!'
            : status.hasUnread
            ? 'New unread staff comment'
            : 'Internal staff comments & notes'
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <MessageCircle
          className={`h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-105 ${
            isOpen || status.hasUnreadMention
              ? 'text-indigo-600 dark:text-indigo-400'
              : status.hasUnread
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        />

        <span className="leading-none">Comment</span>

        {/* State C: Unread direct mention -> @ ● */}
        {status.hasUnreadMention ? (
          <div className="flex items-center gap-1 ml-0.5">
            <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/70 border border-indigo-300 dark:border-indigo-600 px-1 py-0.2 rounded-md leading-none shadow-2xs">
              @
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1 ring-white" />
            </span>
          </div>
        ) : status.hasUnread ? (
          /* State B: Unread comments -> ● */
          <span className="relative flex h-2 w-2 ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1 ring-white" />
          </span>
        ) : null}
        {/* State A: All read -> No indicators */}
      </button>

      {/* Floating Apple-Style Popover */}
      <StaffCommentPopover
        quotationId={quotationId}
        quotationNumber={quotationNumber}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialNotificationStatus={status}
        onCommentsUpdated={(newStatus) => {
          setStatus(newStatus);
        }}
      />
    </div>
  );
}
