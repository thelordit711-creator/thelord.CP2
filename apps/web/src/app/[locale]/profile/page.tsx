'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Briefcase,
  Coins,
  Wallet,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  Save,
  QrCode,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useGetMeQuery, useUpdateProfileMutation } from '../../../store/api/usersApi';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { data: meRes, isLoading, refetch } = useGetMeQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const user = meRes?.data;

  // Wallet and profile edit states
  const [bep20Address, setBep20Address] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [jeebPhone, setJeebPhone] = useState('');
  const [jeebName, setJeebName] = useState('');
  const [jawaliPhone, setJawaliPhone] = useState('');
  const [jawaliName, setJawaliName] = useState('');

  useEffect(() => {
    if (user) {
      setBep20Address(user.payoutMethods?.bep20Address || '');
      setPhoneNumber(user.phoneNumber || '');
      setJeebPhone(user.payoutMethods?.jeebWallet?.registeredPhone || '');
      setJeebName(user.payoutMethods?.jeebWallet?.accountHolderName || '');
      setJawaliPhone(user.payoutMethods?.jawaliWallet?.registeredPhone || '');
      setJawaliName(user.payoutMethods?.jawaliWallet?.accountHolderName || '');
    }
  }, [user]);

  const handleSaveWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({
        phoneNumber: phoneNumber.trim(),
        payoutMethods: {
          bep20Address: bep20Address.trim(),
          preferredMethod: user?.payoutMethods?.preferredMethod || 'BEP20_USDT',
          jeebWallet: {
            isEnabled: Boolean(jeebPhone.trim()),
            registeredPhone: jeebPhone.trim(),
            accountHolderName: jeebName.trim()
          },
          jawaliWallet: {
            isEnabled: Boolean(jawaliPhone.trim()),
            registeredPhone: jawaliPhone.trim(),
            accountHolderName: jawaliName.trim()
          }
        }
      }).unwrap();

      toast.success('تم تحديث بيانات المحافظ والملف الشخصي بنجاح! 💾');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء حفظ التعديلات');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-lord-gold">
        <span className="w-8 h-8 rounded-full border-2 border-lord-gold border-t-transparent animate-spin ml-3" />
        <span>جاري تحميل بيانات الملف الشخصي...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto space-y-6">
      {/* Header Profile Identity Banner */}
      <div className="bg-obsidian-card border border-lord-gold/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-lord-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          {/* Avatar with digital badge */}
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-obsidian-surface to-obsidian-primary border-2 border-lord-gold/60 flex items-center justify-center text-lord-gold shadow-gold-glow">
              <User className="w-12 h-12" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-obsidian-card flex items-center justify-center text-white" title="نشط">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center md:text-right space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl font-black text-white">{user?.fullName || 'عضو المنظومة'}</h1>
              <Badge variant="gold">
                {user?.accessRole === 'SUPER_ADMIN' ? '👑 القائد الأعلى' : user?.accessRole === 'TREASURY' ? '🪙 أمين الصندوق' : '💼 كادر معتمد'}
              </Badge>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-obsidian-surface text-gray-300 border border-gray-800">
                {user?.primaryDepartment || 'الإدارة العامة'}
              </span>
            </div>

            <p className="text-xs text-gray-400 max-w-2xl">
              {user?.jobTitles?.join(' • ') || 'عضو فريق THE LORD OF CRYPTO'}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-400 pt-1 font-mono">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-lord-gold" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-lord-gold" />
                {user?.phoneNumber || 'لم يُحدد'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Compensation & Performance Summary */}
        <div className="space-y-6">
          {/* Compensation Card */}
          <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-lord-gold" />
                <span>المستحقات المالية والرواتب</span>
              </span>
              <span className="text-[10px] text-lord-gold font-mono font-bold">الخزينة المعتمدة</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">الراتب الأساسي المعتمد:</span>
                <span className="font-black text-white font-mono">${(user?.compensation?.baseSalary || 0).toLocaleString()} USDT</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">إجمالي الحوافز والمكافآت:</span>
                <span className="font-bold text-emerald-400 font-mono">+${(user?.compensation?.activeBonuses || 0).toLocaleString()} USDT</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">السلف المسحوبة:</span>
                <span className="font-bold text-amber-400 font-mono">-${(user?.compensation?.activeAdvances || 0).toLocaleString()} USDT</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">الإنذارات الإدارية:</span>
                <span className="font-bold text-red-400 font-mono">{user?.compensation?.warningsCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Skills & Capabilities Card */}
          <div className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 shadow-xl space-y-3">
            <span className="text-xs font-bold text-white flex items-center gap-2 block pb-2 border-b border-gray-800">
              <Award className="w-4 h-4 text-lord-gold" />
              <span>المهارات والقدرات المعتمدة</span>
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {!user?.skills || user.skills.length === 0 ? (
                <span className="text-xs text-gray-500">لم يتم تسجيل مهارات</span>
              ) : (
                user.skills.map((s: any, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-obsidian-surface border border-gray-800 text-[11px] text-gray-300 font-semibold">
                    {s.name} <span className="text-[9px] text-lord-gold">({s.level})</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Wallets & Payout Details Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveWallets} className="bg-obsidian-card border border-obsidian-border rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-lord-gold" />
                  <span>عناوين المحافظ المعتمدة للصرف الفوري</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  تُستخدم هذه المحافظ لتحويل الرواتب ومكافآت المهام ومستحقات الصندوق مباشرة إليك
                </p>
              </div>
              <Button type="submit" variant="gold" size="sm" disabled={isUpdating} className="rounded-xl shadow-gold-glow">
                <Save className="w-3.5 h-3.5 ml-1" />
                <span>{isUpdating ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </Button>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1">رقم الهاتف الرسمي للتواصل:</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="770000000"
                className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold font-mono"
              />
            </div>

            {/* Crypto BEP20 USDT Address */}
            <div className="p-4 bg-obsidian-surface/60 rounded-2xl border border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyber-blue flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  <span>محفظة USDT (شبكة BNB Smart Chain - BEP20)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">الخيار الأساسي</span>
              </div>
              <input
                type="text"
                value={bep20Address}
                onChange={(e) => setBep20Address(e.target.value)}
                placeholder="0x..."
                className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue font-mono"
              />
            </div>

            {/* Local Wallets (Jeeb & Jawali) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Jeeb Wallet */}
              <div className="p-4 bg-obsidian-surface/60 rounded-2xl border border-gray-800 space-y-3">
                <span className="text-xs font-bold text-amber-400 block">📱 محفظة جيب (Jeeb Wallet)</span>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">رقم هاتف المحفظة:</label>
                  <input
                    type="text"
                    value={jeebPhone}
                    onChange={(e) => setJeebPhone(e.target.value)}
                    placeholder="77xxxxxxx"
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">اسم صاحب الحساب:</label>
                  <input
                    type="text"
                    value={jeebName}
                    onChange={(e) => setJeebName(e.target.value)}
                    placeholder="الاسم الرباعي..."
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Jawali Wallet */}
              <div className="p-4 bg-obsidian-surface/60 rounded-2xl border border-gray-800 space-y-3">
                <span className="text-xs font-bold text-purple-400 block">📱 محفظة جوالي (Jawali Wallet)</span>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">رقم هاتف المحفظة:</label>
                  <input
                    type="text"
                    value={jawaliPhone}
                    onChange={(e) => setJawaliPhone(e.target.value)}
                    placeholder="73xxxxxxx"
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">اسم صاحب الحساب:</label>
                  <input
                    type="text"
                    value={jawaliName}
                    onChange={(e) => setJawaliName(e.target.value)}
                    placeholder="الاسم الرباعي..."
                    className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
