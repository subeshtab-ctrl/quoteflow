'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Activity,
  Search,
  Building,
  KeyRound,
  Trash2,
  Power,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffMember, StaffRole, isOwnerOrAdminRole } from '@/types/staff';
import { AddStaffModal } from './add-staff-modal';
import { StaffDetailDrawer } from './staff-detail-drawer';
import { StaffActivityLogView } from './staff-activity-log-view';
import { RolesPermissionsMatrix } from './roles-permissions-matrix';

interface StaffManagementViewProps {
  currentUserRole: string;
  currentUserId: string;
}

export function StaffManagementView({ currentUserRole, currentUserId }: StaffManagementViewProps) {
  const [subTab, setSubTab] = useState<'members' | 'roles' | 'activity'>('members');
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const isOwnerOrAdmin = isOwnerOrAdminRole(currentUserRole);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleStaffAdded = (newStaff: StaffMember) => {
    setStaffList((prev) => [newStaff, ...prev]);
  };

  const handleStaffUpdated = (updated: StaffMember) => {
    setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    if (selectedStaff?.id === updated.id) {
      setSelectedStaff(updated);
    }
  };

  const handleStaffRemoved = (removedId: string) => {
    setStaffList((prev) => prev.filter((s) => s.id !== removedId));
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.branch && s.branch.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === 'all' || s.role.toUpperCase() === roleFilter.toUpperCase();

    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'ADMIN':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'MANAGER':
        return 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800';
      case 'SALES':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'ACCOUNTS':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'MARKETING':
        return 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-purple-50/80 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Team & Staff Management
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
              All staff accounts inherit your parent organization's subscription. Manage roles, granular feature permissions, and inspect admin-only audit trails.
            </p>
          </div>
        </div>

        {isOwnerOrAdmin && (
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 rounded-xl shrink-0 shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Staff Member</span>
          </Button>
        )}
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'members'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff Members ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'roles'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Roles & Permissions Guide</span>
        </button>

        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={() => setSubTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'activity'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Activity Log</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-500/20 text-indigo-200">
              Admin
            </span>
          </button>
        )}
      </div>

      {/* Tab 1: Staff Members List */}
      {subTab === 'members' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, branch..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="all">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="SALES">Sales</option>
                <option value="ACCOUNTS">Accounts</option>
                <option value="MARKETING">Marketing</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs">Loading team accounts...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Users className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No staff members found</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Click "Add Staff Member" to add team members to this organization.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                      <th className="py-3 px-4">Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Last Active</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredStaff.map((staff) => (
                      <tr
                        key={staff.id}
                        onClick={() => setSelectedStaff(staff)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {staff.full_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{staff.full_name}</span>
                                {staff.id === currentUserId && (
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                    (You)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                {staff.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] border ${getRoleBadge(
                              staff.role
                            )}`}
                          >
                            {staff.role}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 flex items-center gap-1 pt-4">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{staff.branch || 'Main Branch'}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              staff.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                            }`}
                          >
                            {staff.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {staff.last_sign_in_at
                            ? new Intl.DateTimeFormat('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }).format(new Date(staff.last_sign_in_at))
                            : 'Never'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-semibold text-xs">
                            <span>Manage</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Roles & Permissions Matrix */}
      {subTab === 'roles' && <RolesPermissionsMatrix />}

      {/* Tab 3: Activity Log (Admin Only) */}
      {subTab === 'activity' && isOwnerOrAdmin && (
        <StaffActivityLogView currentUserRole={currentUserRole} />
      )}

      {/* Add Staff Modal */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStaffAdded={handleStaffAdded}
        currentUserRole={currentUserRole}
      />

      {/* Staff Detail Drawer */}
      <StaffDetailDrawer
        staff={selectedStaff}
        onClose={() => setSelectedStaff(null)}
        onStaffUpdated={handleStaffUpdated}
        onStaffRemoved={handleStaffRemoved}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
      />
    </div>
  );
}
