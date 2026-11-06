'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageCircle,
  AtSign,
  Lock,
  Loader2,
  Clock,
  User,
  Sparkles,
} from 'lucide-react';
import {
  StaffComment,
  StaffMentionOption,
  QuotationCommentNotificationStatus,
} from '@/types/staff-comment';
import { formatDateTime } from '@/lib/utils';

interface StaffCommentPopoverProps {
  quotationId: string;
  quotationNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentsUpdated?: (status: QuotationCommentNotificationStatus) => void;
  initialNotificationStatus?: QuotationCommentNotificationStatus;
}

export function StaffCommentPopover({
  quotationId,
  quotationNumber,
  isOpen,
  onClose,
  onCommentsUpdated,
  initialNotificationStatus,
}: StaffCommentPopoverProps) {
  const [comments, setComments] = useState<StaffComment[]>([]);
  const [staffList, setStaffList] = useState<StaffMentionOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Comment Form State
  const [commentText, setCommentText] = useState('');
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);

  // Mention Autocomplete State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number>(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const [showMentionMenu, setShowMentionMenu] = useState(false);

  // Unread Tracking State
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(
    initialNotificationStatus?.lastReadAt
      ? new Date(initialNotificationStatus.lastReadAt).getTime()
      : 0
  );

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load comments from API
  const fetchComments = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
        setStaffList(data.staff || []);
        setCurrentUserId(data.currentUserId || '');

        if (data.notificationStatus) {
          if (data.notificationStatus.lastReadAt) {
            setLastReadTimestamp(new Date(data.notificationStatus.lastReadAt).getTime());
          }
        }
      }
    } catch (err: any) {
      console.warn('Error loading staff comments:', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  // Mark all comments as read for this user
  const markAsRead = async () => {
    try {
      await fetch(`/api/quotations/${quotationId}/comments/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setLastReadTimestamp(Date.now());
      if (onCommentsUpdated) {
        onCommentsUpdated({
          hasUnread: false,
          hasUnreadMention: false,
          unreadCount: 0,
          unreadMentionCount: 0,
          lastReadAt: new Date().toISOString(),
        });
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments(true).then(() => {
        // Mark read after comments are retrieved and displayed
        markAsRead();
      });

      // Poll every 8 seconds while popover is open
      const interval = setInterval(() => {
        fetchComments(false);
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [isOpen, quotationId]);

  // Scroll to bottom on comment list update
  useEffect(() => {
    if (isOpen && comments.length > 0) {
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  }, [comments.length, isOpen]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Handle outside click to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Filter mention candidates based on active @query
  const filteredStaff = staffList.filter((s) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  });

  // Handle text typing & detecting '@' symbol
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);
    setErrorMsg(null);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      // Check if @ is at start of line or preceded by space
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n') {
        const query = textBeforeCursor.slice(atIndex + 1);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionCursorIndex(atIndex);
          setShowMentionMenu(true);
          setMentionSelectedIndex(0);
          return;
        }
      }
    }

    setShowMentionMenu(false);
    setMentionQuery(null);
  };

  // Keyboard navigation for @mention menu
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredStaff.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % filteredStaff.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) =>
          prev === 0 ? filteredStaff.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selectedStaff = filteredStaff[mentionSelectedIndex];
        if (selectedStaff) {
          applyMention(selectedStaff);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
        return;
      }
    }

    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handlePostComment();
    }
  };

  // Insert selected mention into textarea
  const applyMention = (staff: StaffMentionOption) => {
    if (mentionCursorIndex === -1) return;

    const beforeAt = commentText.slice(0, mentionCursorIndex);
    const afterMention = commentText.slice(textareaRef.current?.selectionStart || mentionCursorIndex + 1);
    const insertedName = `@${staff.full_name} `;
    const updatedText = beforeAt + insertedName + afterMention;

    setCommentText(updatedText);
    if (!selectedMentionIds.includes(staff.id)) {
      setSelectedMentionIds((prev) => [...prev, staff.id]);
    }

    setShowMentionMenu(false);
    setMentionQuery(null);

    // Reposition cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = beforeAt.length + insertedName.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Submit comment
  const handlePostComment = async () => {
    const text = commentText.trim();
    if (!text) {
      setErrorMsg('Please enter a comment');
      return;
    }

    setIsPosting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/quotations/${quotationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          mentions: selectedMentionIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to post comment');
      }

      setCommentText('');
      setSelectedMentionIds([]);
      setComments((prev) => [...prev, data.comment]);
      markAsRead();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save comment');
    } finally {
      setIsPosting(false);
    }
  };

  // Helper to render text with highlighted @mentions
  const renderFormattedCommentText = (text: string) => {
    // Regex matches @FullName or @word patterns
    const parts = text.split(/(@[A-Za-z0-9_\s.-]+?)(?=[.,!?\s]|$)/g);

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const mentionTarget = part.slice(1).trim().toLowerCase();
        const matchedStaff = staffList.find(
          (s) =>
            s.full_name.toLowerCase() === mentionTarget ||
            s.email.split('@')[0].toLowerCase() === mentionTarget
        );

        const isMentionedMe = matchedStaff && matchedStaff.id === currentUserId;

        return (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-semibold text-[11px] transition-colors ${
              isMentionedMe
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80'
            }`}
          >
            <span>@</span>
            <span>{matchedStaff?.full_name || part.slice(1)}</span>
            {isMentionedMe && <span className="text-[9px] opacity-80">(You)</span>}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Role pill colors
  const getRoleBadge = (role?: string) => {
    const r = (role || 'STAFF').toUpperCase();
    if (r === 'OWNER') return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300';
    if (r === 'ADMIN') return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300';
    if (r === 'MANAGER') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
    if (r === 'SALES') return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300';
    if (r === 'ACCOUNTS') return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300';
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  };

  // Avatar Initials Color
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-indigo-500 text-white',
      'bg-blue-500 text-white',
      'bg-teal-500 text-white',
      'bg-emerald-500 text-white',
      'bg-amber-500 text-white',
      'bg-rose-500 text-white',
      'bg-purple-500 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-1.5rem)] max-h-[500px] flex flex-col bg-white/95 dark:bg-[#121B2B]/95 backdrop-blur-xl border border-slate-200/90 dark:border-[#22324C] rounded-2xl shadow-2xl shadow-slate-900/15 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 ring-1 ring-slate-900/5 select-text"
      role="dialog"
      aria-labelledby="staff-comments-title"
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-[#22324C] bg-slate-50/70 dark:bg-[#162338]/70 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
            <MessageCircle className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 id="staff-comments-title" className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                Staff Comments
              </h3>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Lock className="h-2.5 w-2.5" />
                <span>Internal</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
              {quotationNumber} • Not visible to customer
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          title="Close comments"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Comment Conversation History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[160px] max-h-[290px] scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-[11px]">Loading conversation...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mb-2 shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No staff comments yet
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[240px] mt-1 leading-snug">
              Leave private notes for technicians, sales, or accounts. Type <span className="font-semibold text-indigo-600 dark:text-indigo-400">@</span> to mention a team member.
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMe = comment.author_id === currentUserId;
            const isUnread =
              !isMe &&
              lastReadTimestamp > 0 &&
              new Date(comment.created_at).getTime() > lastReadTimestamp;

            const isMentioned =
              Array.isArray(comment.mentions) && comment.mentions.includes(currentUserId);

            const initials = (comment.author_name || 'Staff')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={comment.id}
                className={`group relative flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                  isMentioned
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60'
                    : isUnread
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-l-2 border-emerald-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Staff Avatar */}
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${getAvatarColor(
                    comment.author_name || 'Staff'
                  )}`}
                >
                  {initials}
                </div>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-900 dark:text-white leading-tight">
                      {comment.author_name}
                      {isMe && <span className="text-slate-400 font-normal ml-1">(You)</span>}
                    </span>

                    {comment.author_role && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getRoleBadge(
                          comment.author_role
                        )}`}
                      >
                        {comment.author_role}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto whitespace-nowrap">
                      {formatDateTime(comment.created_at)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed break-words whitespace-pre-wrap font-normal">
                    {renderFormattedCommentText(comment.text)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Mentions Autocomplete Floating Menu */}
      {showMentionMenu && filteredStaff.length > 0 && (
        <div className="absolute left-3 right-3 bottom-[115px] max-h-36 overflow-y-auto bg-white dark:bg-[#1a263c] border border-slate-200 dark:border-[#2d4060] rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in-0 duration-150">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1">
            <AtSign className="h-3 w-3 text-indigo-500" />
            <span>Mention Team Member</span>
          </div>
          {filteredStaff.map((staff, idx) => (
            <button
              key={staff.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applyMention(staff);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left rounded-lg text-xs transition-colors cursor-pointer ${
                idx === mentionSelectedIndex
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${getAvatarColor(
                    staff.full_name
                  )}`}
                >
                  {staff.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-xs leading-none block">
                    {staff.full_name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-none">
                    {staff.email}
                  </span>
                </div>
              </div>
              <span className={`text-[9px] px-1 py-0.5 rounded border uppercase ${getRoleBadge(staff.role)}`}>
                {staff.role}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Popover Footer (Input Form) */}
      <div className="p-2.5 border-t border-slate-100 dark:border-[#22324C] bg-white dark:bg-[#121B2B] shrink-0">
        {errorMsg && (
          <div className="mb-2 px-2 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[11px] font-medium border border-rose-200">
            {errorMsg}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={2}
            value={commentText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Write internal staff comment... (type @ to mention)"
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-[#253754] bg-slate-50/70 dark:bg-[#162338]/60 px-2.5 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none leading-relaxed"
            maxLength={1000}
            disabled={isPosting}
          />
        </div>

        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              {commentText.length}/1000
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              • Ctrl+Enter to post
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPosting}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePostComment}
              disabled={isPosting || !commentText.trim()}
              className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              {isPosting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  <span>Comment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
