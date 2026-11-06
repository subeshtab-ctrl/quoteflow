'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Activity,
  Calendar,
  User,
  Shield,
  Layers,
  FileText,
  Clock,
  ArrowRight,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { StaffActivityLog, StaffMember, StaffRole } from '@/types/staff';
import { ActivityDetailModal } from './activity-detail-modal';
import { Button } from '@/components/ui/button';

interface StaffActivityLogViewProps {
  currentUserRole: string;
}

const MODULES = [
  'QUOTATION',
  'INVOICE',
  'CUSTOMER',
  'PAYMENT',
  'STAFF',
  'SETTINGS',
  'REPORT',
  'AUTH',
];

const ROLES: StaffRole[] = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'SALES',
  'ACCOUNTS',
  'MARKETING',
  'CUSTOM',
  'STAFF',
];

export function StaffActivityLogView({ currentUserRole }: StaffActivityLogViewProps) {
  const [logs, setLogs] = useState<StaffActivityLog[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<StaffActivityLog | null>(null);

  const fetchStaffList = async () => {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch {}
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedStaff !== 'all') params.set('staff_id', selectedStaff);
      if (selectedRole !== 'all') params.set('role', selectedRole);
      if (selectedModule !== 'all') params.set('module', selectedModule);
      if (selectedAction !== 'all') params.set('action', selectedAction);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      params.set('limit', '100');

      const res = await fetch(`/api/staff/activity?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalCount(data.total || 0);
      } else if (res.status === 403) {
        setLogs([]);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
    fetchLogs();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStaff('all');
    setSelectedRole('all');
    setSelectedModule('all');
    setSelectedAction('all');
    setStartDate('');
    setEndDate('');
    setTimeout(fetchLogs, 10);
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('INVITE')) {
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
    if (act.includes('DELETE') || act.includes('REMOVE')) {
      return 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('CHANGE')) {
      return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    }
    if (act.includes('SEND') || act.includes('EXPORT')) {
      return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    }
    return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  const getModuleBadgeClass = (mod: string) => {
    const m = mod.toUpperCase();
    if (m === 'QUOTATION') return 'text-purple-600 dark:text-purple-400';
    if (m === 'INVOICE') return 'text-emerald-600 dark:text-emerald-400';
    if (m === 'CUSTOMER') return 'text-blue-600 dark:text-blue-400';
    if (m === 'STAFF') return 'text-pink-600 dark:text-pink-400';
    if (m === 'PAYMENT') return 'text-teal-600 dark:text-teal-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Activity Log</h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable, tamper-resistant business audit trail for quotes, invoices, customers, and staff events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="text-xs gap-1.5 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quote #, actor, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Staff Filter */}
          <div>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Modules</option>
              {MODULES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filters & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            />
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            >
              Reset
            </button>
            <Button type="submit" size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              Apply Filters
            </Button>
          </div>
        </div>
      </form>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Audit Trail ({totalCount} {totalCount === 1 ? 'event' : 'events'})
          </span>
          <span className="text-[11px] text-slate-400">Click any row for complete diff & payload</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading activity audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No activity events found</p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Actions performed by team members will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Record</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {logs.map((log) => {
                  const dateObj = new Date(log.created_at);
                  const formattedDate = new Intl.DateTimeFormat('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  }).format(dateObj);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {log.user_name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {log.user_email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.user_role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-semibold ${getModuleBadgeClass(log.module)}`}>
                          {log.module}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {log.target_identifier || log.target_id || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {log.details || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Detail Modal */}
      <ActivityDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
