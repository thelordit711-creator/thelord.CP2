'use client';

import React from 'react';
import {
  LayoutGrid,
  List,
  Calendar,
  BarChart2,
  Search,
  Repeat
} from 'lucide-react';

interface TaskFilterToolbarProps {
  activeView: 'board' | 'list' | 'timeline' | 'analytics';
  setActiveView: (view: 'board' | 'list' | 'timeline' | 'analytics') => void;
  isAdmin: boolean;
  employees: any[];
  adminSelectedEmployee: string;
  setAdminSelectedEmployee: (empId: string) => void;
  employeeFilterScope: 'MY_TASKS' | 'ALL_TASKS';
  setEmployeeFilterScope: (scope: 'MY_TASKS' | 'ALL_TASKS') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onlyDailyFilter: boolean;
  setOnlyDailyFilter: (val: boolean) => void;
  dailyTasksCount: number;
  platformFilter: string;
  setPlatformFilter: (platform: string) => void;
}

export const TaskFilterToolbar: React.FC<TaskFilterToolbarProps> = ({
  activeView,
  setActiveView,
  isAdmin,
  employees,
  adminSelectedEmployee,
  setAdminSelectedEmployee,
  employeeFilterScope,
  setEmployeeFilterScope,
  searchQuery,
  setSearchQuery,
  onlyDailyFilter,
  setOnlyDailyFilter,
  dailyTasksCount,
  platformFilter,
  setPlatformFilter
}) => {
  return (
    <div className="space-y-3.5 pt-3 border-t border-gray-800">
      {/* Tier 1: View Toggles & Scope Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Toggles */}
        <div className="flex items-center bg-obsidian-primary p-1 rounded-2xl border border-gray-800 text-xs overflow-x-auto max-w-full no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeView === 'board'
                ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>لوحة كانبان (Board)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeView === 'list'
                ? 'bg-blue-600 text-white shadow-blue-glow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span>جدول المهام (List)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeView === 'timeline'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>المخطط الزمني (Timeline)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeView === 'analytics'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>التحليلات ومعدل الإنجاز</span>
          </button>
        </div>

        {/* Scope Selector: Admin (Employee Filter) / Employee (Scope Switcher) */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin ? (
            <select
              value={adminSelectedEmployee}
              onChange={(e) => setAdminSelectedEmployee(e.target.value)}
              className="bg-obsidian-primary border border-lord-gold/40 rounded-xl px-3 py-1.5 text-xs text-lord-gold font-bold focus:outline-none focus:border-lord-gold"
              title="تصفية المهام حسب الموظف المسند إليه"
            >
              <option value="ALL">جميع الموظفين (مراقبة عامة)</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.primaryDepartment || emp.accessRole})
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center bg-obsidian-primary p-1 rounded-2xl border border-gray-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setEmployeeFilterScope('MY_TASKS')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                  employeeFilterScope === 'MY_TASKS'
                    ? 'bg-lord-gold text-black shadow-gold-glow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                مهامي المسندة
              </button>
              <button
                type="button"
                onClick={() => setEmployeeFilterScope('ALL_TASKS')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                  employeeFilterScope === 'ALL_TASKS'
                    ? 'bg-lord-gold text-black shadow-gold-glow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                مهام الفريق
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
          <input
            type="text"
            placeholder="بحث في أسماء المهام..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-obsidian-surface border border-gray-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-all"
          />
        </div>

        {/* Daily Routine Filter Button */}
        <button
          type="button"
          onClick={() => setOnlyDailyFilter(!onlyDailyFilter)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
            onlyDailyFilter
              ? 'bg-purple-600 text-white border-purple-500 shadow-md'
              : 'bg-obsidian-surface text-gray-400 border-gray-800 hover:text-white'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>المهام اليومية ({dailyTasksCount})</span>
        </button>

        {/* Platform Selector */}
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-lord-gold"
        >
          <option value="ALL">كافة المنصات</option>
          <option value="TG_VIP">قناة VIP (تليجرام)</option>
          <option value="TG_MAIN">القناة العامة</option>
          <option value="X_1">حساب X</option>
          <option value="YOUTUBE">يوتيوب</option>
          <option value="GENERAL_SYSTEM">النظام العام</option>
        </select>
      </div>
    </div>
  );
};

