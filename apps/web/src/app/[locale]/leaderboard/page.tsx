'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Flame,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Star,
  Users
} from 'lucide-react';
import { useGetLeaderboardQuery } from '../../../store/api/usersApi';
import { Badge } from '../../../components/ui/Badge';

export default function LeaderboardPage() {
  const { data: leaderboardRes, isLoading } = useGetLeaderboardQuery();
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | 'WEEK' | 'MONTH'>('ALL');

  const leaderboard = leaderboardRes?.data || [];
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-lord-gold">
        <span className="w-8 h-8 rounded-full border-2 border-lord-gold border-t-transparent animate-spin ml-3" />
        <span>جاري احتساب وترتيب نقاط أداء الكادر وفق معادلة KPI...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-lord-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-lord-gold via-yellow-600 to-amber-700 flex items-center justify-center text-obsidian-primary shadow-gold-glow shrink-0">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white">لوحة شرف وتقييم أداء الكادر (Leaderboard & KPIs)</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lord-gold/20 text-lord-gold font-bold border border-lord-gold/40">
                  خوارزمية ذكية
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ترتيب تفاعلي لحظي يحتسب النقاط وفق: نسبة الإنجاز (40%) + كفاءة السرعة (30%) + جودة المخرجات والاعتماد (30%)
              </p>
            </div>
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center bg-obsidian-primary p-1 rounded-2xl border border-gray-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterPeriod('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterPeriod === 'ALL'
                  ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              الترتيب التراكمي العام
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('MONTH')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterPeriod === 'MONTH'
                  ? 'bg-blue-600 text-white shadow-blue-glow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              الأفضل هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('WEEK')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterPeriod === 'WEEK'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              هذا الأسبوع
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Podium (منصة الشرف للمراكز الثلاثة الأولى) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        {/* Rank 2 (Silver) */}
        {top2 && (
          <div className="order-2 md:order-1 bg-gradient-to-t from-obsidian-card via-obsidian-surface to-obsidian-card border border-gray-400/40 rounded-3xl p-6 text-center space-y-3 relative shadow-xl hover:scale-105 transition-all">
            <span className="w-10 h-10 rounded-2xl bg-gray-400/20 text-gray-300 border border-gray-400/50 flex items-center justify-center font-black text-sm mx-auto shadow-md">
              🥈 2
            </span>
            <div className="w-20 h-20 rounded-full mx-auto bg-gray-800 border-2 border-gray-400/60 flex items-center justify-center text-gray-300 font-bold text-xl">
              {top2.user?.fullName?.charAt(0) || '2'}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{top2.user?.fullName}</h3>
              <span className="text-[11px] text-gray-400">{top2.user?.primaryDepartment || 'كادر'}</span>
            </div>
            <div className="p-3 bg-obsidian-primary/60 rounded-2xl border border-gray-800">
              <span className="text-2xl font-black text-white font-mono">{top2.stats.totalScore}%</span>
              <span className="text-[10px] text-gray-400 block">إجمالي كفاءة الأداء</span>
            </div>
          </div>
        )}

        {/* Rank 1 (Gold Crown) - Center & Prominent */}
        {top1 && (
          <div className="order-1 md:order-2 bg-gradient-to-t from-obsidian-card via-amber-950/20 to-obsidian-card border-2 border-lord-gold rounded-3xl p-8 text-center space-y-4 relative shadow-2xl scale-105 relative z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-lord-gold to-yellow-600 text-obsidian-primary font-black text-xs shadow-gold-glow flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>فارس المنظومة والأول 👑</span>
            </div>

            <span className="w-12 h-12 rounded-2xl bg-lord-gold/25 text-lord-gold border border-lord-gold/50 flex items-center justify-center font-black text-lg mx-auto shadow-gold-glow mt-2">
              🥇 1
            </span>
            <div className="w-24 h-24 rounded-full mx-auto bg-obsidian-surface border-4 border-lord-gold flex items-center justify-center text-lord-gold font-black text-2xl shadow-gold-glow">
              {top1.user?.fullName?.charAt(0) || '1'}
            </div>
            <div>
              <h3 className="text-base font-black text-white">{top1.user?.fullName}</h3>
              <span className="text-xs text-lord-gold font-semibold">{top1.user?.primaryDepartment || 'كادر'}</span>
            </div>
            <div className="p-4 bg-obsidian-primary/80 rounded-2xl border border-lord-gold/30">
              <span className="text-3xl font-black text-lord-gold font-mono">{top1.stats.totalScore}%</span>
              <span className="text-xs text-gray-400 block mt-0.5">الرصيد التنافسي التراكمي</span>
            </div>
          </div>
        )}

        {/* Rank 3 (Bronze) */}
        {top3 && (
          <div className="order-3 md:order-3 bg-gradient-to-t from-obsidian-card via-obsidian-surface to-obsidian-card border border-amber-700/40 rounded-3xl p-6 text-center space-y-3 relative shadow-xl hover:scale-105 transition-all">
            <span className="w-10 h-10 rounded-2xl bg-amber-700/20 text-amber-500 border border-amber-700/50 flex items-center justify-center font-black text-sm mx-auto shadow-md">
              🥉 3
            </span>
            <div className="w-20 h-20 rounded-full mx-auto bg-gray-800 border-2 border-amber-700/60 flex items-center justify-center text-amber-500 font-bold text-xl">
              {top3.user?.fullName?.charAt(0) || '3'}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{top3.user?.fullName}</h3>
              <span className="text-[11px] text-gray-400">{top3.user?.primaryDepartment || 'كادر'}</span>
            </div>
            <div className="p-3 bg-obsidian-primary/60 rounded-2xl border border-gray-800">
              <span className="text-2xl font-black text-white font-mono">{top3.stats.totalScore}%</span>
              <span className="text-[10px] text-gray-400 block">إجمالي كفاءة الأداء</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-obsidian-card border border-obsidian-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-obsidian-surface border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-lord-gold" />
            <h3 className="text-xs font-bold text-white">ترتيب كافة أعضاء الفريق وتفكيك نسب التقييم الثلاثية</h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Total {leaderboard.length} Members</span>
        </div>

        <div className="divide-y divide-gray-800/60 overflow-x-auto">
          {leaderboard.map((item) => (
            <div
              key={item.user?._id}
              className={`p-4 flex items-center justify-between gap-4 transition-colors hover:bg-obsidian-surface/60 ${
                item.rank === 1 ? 'bg-lord-gold/5' : ''
              }`}
            >
              {/* Rank & User Info */}
              <div className="flex items-center gap-4 min-w-[200px]">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    item.rank === 1
                      ? 'bg-lord-gold text-obsidian-primary shadow-gold-glow'
                      : item.rank === 2
                      ? 'bg-gray-400 text-obsidian-primary'
                      : item.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-obsidian-surface text-gray-400 border border-gray-800'
                  }`}
                >
                  #{item.rank}
                </span>

                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{item.user?.fullName}</span>
                    {item.rank <= 3 && <Sparkles className="w-3.5 h-3.5 text-lord-gold" />}
                  </h4>
                  <span className="text-[10px] text-gray-400">{item.user?.primaryDepartment || 'عام'}</span>
                </div>
              </div>

              {/* KPI Factors Breakdown */}
              <div className="hidden sm:flex items-center gap-6 text-center text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] block">نسبة الإنجاز (40%)</span>
                  <span className="font-bold text-white font-mono">{item.stats.completionRate}%</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">كفاءة السرعة (30%)</span>
                  <span className="font-bold text-cyber-blue font-mono">{item.stats.speedRate}%</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">جودة الاعتماد (30%)</span>
                  <span className="font-bold text-emerald-400 font-mono">{item.stats.qualityRate}%</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">المهام المكتملة</span>
                  <span className="font-bold text-purple-400 font-mono">{item.stats.completedCount}</span>
                </div>
              </div>

              {/* Total Score Badge */}
              <div className="text-left shrink-0">
                <span className="text-lg font-black text-lord-gold font-mono">{item.stats.totalScore}%</span>
                <span className="text-[9px] text-gray-500 block">المجموع النهائي</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

