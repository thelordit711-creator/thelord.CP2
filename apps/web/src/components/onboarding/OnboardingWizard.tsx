'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { useCompleteOnboardingMutation } from '../../store/api/usersApi';
import { PrimaryDepartment, JobTitle, SkillLevel, PayoutMethod } from '@lord/shared-types';
import { CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const DEPARTMENTS: { id: PrimaryDepartment; label: string }[] = [
  { id: 'TRADING', label: 'التحليل والتداول' },
  { id: 'MARKETING', label: 'التسويق والإعلانات' },
  { id: 'CONTENT_MEDIA', label: 'صناعة المحتوى والمونتاج' },
  { id: 'DEVELOPMENT', label: 'البرمجة وتطوير البوتات' },
  { id: 'SUPPORT', label: 'خدمة العملاء والمبيعات' },
  { id: 'MANAGEMENT', label: 'الإدارة والنمو' }
];

const JOB_TITLES: { id: JobTitle; label: string; dept: PrimaryDepartment }[] = [
  { id: 'DEAL_ANALYST', label: 'محلل صفقات', dept: 'TRADING' },
  { id: 'TG_CONTENT_MANAGER', label: 'مدير محتوى تليجرام', dept: 'CONTENT_MEDIA' },
  { id: 'SUPPORT_AGENT', label: 'موظف دعم (Sales VIP)', dept: 'SUPPORT' },
  { id: 'WEB_BOT_DEVELOPER', label: 'مبرمج ويب وبوتات', dept: 'DEVELOPMENT' },
  { id: 'TG_ADS_MANAGER', label: 'مدير إعلانات Telegram Ads', dept: 'MARKETING' },
  { id: 'TG_CHANNEL_PROMO_MANAGER', label: 'مدير إعلانات قنوات تليجرام', dept: 'MARKETING' },
  { id: 'GRAPHIC_VIDEO_EDITOR', label: 'موظف جرافيكس ومونتاج', dept: 'CONTENT_MEDIA' },
  { id: 'YOUTUBE_MANAGER', label: 'مسؤول يوتيوب', dept: 'CONTENT_MEDIA' },
  { id: 'X_PLATFORM_MANAGER', label: 'مسؤول منصة X (1 و 2)', dept: 'CONTENT_MEDIA' },
  { id: 'FB_IG_MANAGER', label: 'مسؤول فيسبوك وإنستقرام', dept: 'CONTENT_MEDIA' },
  { id: 'MARKETING_DEV_LEAD', label: 'مسؤول التسويق والتطوير', dept: 'MANAGEMENT' }
];

export const OnboardingWizard: React.FC = () => {
  const router = useRouter();
  const [completeOnboarding, { isLoading }] = useCompleteOnboardingMutation();

  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [department, setDepartment] = useState<PrimaryDepartment>('TRADING');
  const [selectedJobs, setSelectedJobs] = useState<JobTitle[]>(['DEAL_ANALYST']);
  const [skills, setSkills] = useState<{ name: string; level: SkillLevel }[]>([
    { name: 'التحليل الفني وإدارة المخاطر', level: 'ADVANCED' }
  ]);
  const [skillInput, setSkillInput] = useState('');
  const [tools, setTools] = useState<string[]>(['TradingView', 'Telegram Desktop']);
  const [toolInput, setToolInput] = useState('');

  // Payment State
  const [preferredMethod, setPreferredMethod] = useState<PayoutMethod>('BEP20_USDT');
  const [bep20Address, setBep20Address] = useState('');
  
  // Jeeb Wallet
  const [jeebEnabled, setJeebEnabled] = useState(false);
  const [jeebPhone, setJeebPhone] = useState('');
  const [jeebAccountName, setJeebAccountName] = useState('');

  // Jawali Wallet
  const [jawaliEnabled, setJawaliEnabled] = useState(false);
  const [jawaliPhone, setJawaliPhone] = useState('');
  const [jawaliAccountName, setJawaliAccountName] = useState('');

  const toggleJob = (job: JobTitle) => {
    setSelectedJobs(prev =>
      prev.includes(job) ? prev.filter(j => j !== job) : [...prev, job]
    );
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      setSkills(prev => [...prev, { name: skillInput.trim(), level: 'ADVANCED' }]);
      setSkillInput('');
    }
  };

  const addTool = () => {
    if (toolInput.trim()) {
      setTools(prev => [...prev, toolInput.trim()]);
      setToolInput('');
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        primaryDepartment: department,
        jobTitles: selectedJobs,
        skills,
        toolsUsed: tools,
        capableTaskTypes: selectedJobs.map(j => j.toString()),
        payoutMethods: {
          preferredMethod,
          bep20Address: bep20Address.trim() || undefined,
          jeebWallet: {
            isEnabled: jeebEnabled,
            registeredPhone: jeebPhone.trim() || undefined,
            accountHolderName: jeebAccountName.trim() || undefined
          },
          jawaliWallet: {
            isEnabled: jawaliEnabled,
            registeredPhone: jawaliPhone.trim() || undefined,
            accountHolderName: jawaliAccountName.trim() || undefined
          }
        }
      };

      await completeOnboarding(payload).unwrap();
      toast.success('تم إعداد ملفك المهني والمالي بنجاح!');
      router.push('/ar/workspace');
    } catch (err: any) {
      toast.error(err?.data?.error || 'حدث خطأ أثناء حفظ البيانات');
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-8 bg-obsidian-surface border border-lord-gold/30 rounded-3xl p-6 md:p-10 shadow-2xl">
      {/* Wizard Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold text-lord-gold tracking-widest uppercase">
          THE LORD OF CRYPTO — ONBOARDING
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
          تهيئة الملف المهني ومنظومة الصرف
        </h1>
        <p className="text-xs md:text-sm text-gray-400 mt-2">
          أكمل الخطوات الخمس لتفعيل حسابك وربط محفظة BEP20 والمحافظ المحلية (جيب / جوالي)
        </p>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[1, 2, 3, 4, 5].map(step => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentStep === step
                  ? 'w-10 bg-lord-gold shadow-gold-glow'
                  : currentStep > step
                  ? 'w-4 bg-emerald-500'
                  : 'w-4 bg-gray-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Department & Job Titles */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-white mb-2">1. اختر القسم الأساسي:</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {DEPARTMENTS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepartment(d.id)}
                  className={`p-3 rounded-xl border text-sm font-semibold text-right transition-all ${
                    department === d.id
                      ? 'border-lord-gold bg-lord-gold/15 text-lord-gold'
                      : 'border-obsidian-border bg-obsidian-card text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">
              2. حدد مسماك الوظيفي (يمكنك اختيار أكثر من وظيفة):
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {JOB_TITLES.map(job => {
                const isSelected = selectedJobs.includes(job.id);
                return (
                  <div
                    key={job.id}
                    onClick={() => toggleJob(job.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-lord-gold bg-lord-gold/10 text-white'
                        : 'border-obsidian-border bg-obsidian-card text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-sm font-medium">{job.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-lord-gold" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Skills */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <label className="block text-sm font-bold text-white mb-2">
            أضف مهاراتك الأساسية ومستوى إتقانها:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="مثال: تحليل SMC، إدارة حملات تليجرام، برمجة بوتات Python..."
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 bg-obsidian-card border border-obsidian-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lord-gold"
            />
            <Button type="button" variant="gold" size="sm" onClick={addSkill}>
              إضافة
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {skills.map((s, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg bg-obsidian-card border border-lord-gold/30 text-xs text-lord-gold flex items-center gap-2"
              >
                <span>{s.name}</span>
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Tools */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <label className="block text-sm font-bold text-white mb-2">
            الأدوات والبرامج التي تستخدمها يومياً:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="مثال: Premiere Pro, MT5, TGStat, Notion..."
              value={toolInput}
              onChange={e => setToolInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTool())}
              className="flex-1 bg-obsidian-card border border-obsidian-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-lord-gold"
            />
            <Button type="button" variant="cyber" size="sm" onClick={addTool}>
              إضافة
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {tools.map((t, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg bg-obsidian-card border border-cyber-blue/30 text-xs text-cyber-blue flex items-center gap-2"
              >
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => setTools(tools.filter((_, i) => i !== idx))}
                  className="text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Dual Payment Setup (BEP20 + Jeeb + Jawali) */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-white mb-2">
              وسيلة الدفع الافتراضية المفضلة لصرف مستحقاتك:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'BEP20_USDT', label: '🪙 BEP20 (USDT)' },
                { id: 'JEEB_WALLET', label: '📱 محفظة جيب' },
                { id: 'JAWALI_WALLET', label: '📱 محفظة جوالي' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreferredMethod(opt.id as PayoutMethod)}
                  className={`p-3 rounded-xl border text-xs md:text-sm font-bold transition-all ${
                    preferredMethod === opt.id
                      ? 'border-lord-gold bg-lord-gold/15 text-lord-gold shadow-gold-glow'
                      : 'border-obsidian-border bg-obsidian-card text-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* BEP20 Section */}
          <div className="p-4 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-3">
            <div className="flex items-center gap-2 text-lord-gold font-bold text-sm">
              <Wallet className="w-4 h-4" />
              <span>عنوان محفظة BEP20 (USDT):</span>
            </div>
            <input
              type="text"
              placeholder="0x..."
              value={bep20Address}
              onChange={e => setBep20Address(e.target.value)}
              className="w-full bg-obsidian-primary border border-gray-700 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-lord-gold"
            />
          </div>

          {/* Local Wallets: Jeeb */}
          <div className="p-4 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold text-sm">📱 محفظة جيب (Jeeb Wallet):</span>
              <label className="text-xs text-gray-400 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jeebEnabled}
                  onChange={e => setJeebEnabled(e.target.checked)}
                  className="rounded text-lord-gold"
                />
                <span>تفعيل لاستلام الرواتب/المكافآت</span>
              </label>
            </div>
            {jeebEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <input
                  type="text"
                  placeholder="رقم الهاتف المسجل بجيب (مثال: 777123456)"
                  value={jeebPhone}
                  onChange={e => setJeebPhone(e.target.value)}
                  className="bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-emerald-400"
                />
                <input
                  type="text"
                  placeholder="الاسم الرباعي كما في محفظة جيب"
                  value={jeebAccountName}
                  onChange={e => setJeebAccountName(e.target.value)}
                  className="bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-400"
                />
              </div>
            )}
          </div>

          {/* Local Wallets: Jawali */}
          <div className="p-4 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold text-sm">📱 محفظة جوالي (Jawali Wallet):</span>
              <label className="text-xs text-gray-400 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jawaliEnabled}
                  onChange={e => setJawaliEnabled(e.target.checked)}
                  className="rounded text-lord-gold"
                />
                <span>تفعيل لاستلام الرواتب/المكافآت</span>
              </label>
            </div>
            {jawaliEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <input
                  type="text"
                  placeholder="رقم الهاتف المسجل بجوالي (مثال: 777123456)"
                  value={jawaliPhone}
                  onChange={e => setJawaliPhone(e.target.value)}
                  className="bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-emerald-400"
                />
                <input
                  type="text"
                  placeholder="الاسم الرباعي كما في محفظة جوالي"
                  value={jawaliAccountName}
                  onChange={e => setJawaliAccountName(e.target.value)}
                  className="bg-obsidian-primary border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-400"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-obsidian-card border border-lord-gold/30 space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">القسم:</span>
              <span className="text-lord-gold font-bold">{department}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">الوظائف:</span>
              <span className="text-white font-bold">{selectedJobs.join(', ')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-400">الوسيلة المفضلة:</span>
              <span className="text-lord-gold font-bold">{preferredMethod}</span>
            </div>
            {bep20Address && (
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-400">BEP20:</span>
                <span className="text-gray-300 font-mono text-xs">{bep20Address}</span>
              </div>
            )}
            {jeebEnabled && (
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-400">جيب:</span>
                <span className="text-emerald-400 font-mono text-xs">{jeebPhone} ({jeebAccountName})</span>
              </div>
            )}
            {jawaliEnabled && (
              <div className="flex justify-between">
                <span className="text-gray-400">جوالي:</span>
                <span className="text-emerald-400 font-mono text-xs">{jawaliPhone} ({jawaliAccountName})</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-obsidian-border">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setCurrentStep(prev => prev - 1)}
          >
            <ChevronRight className="w-4 h-4 ml-1" />
            <span>السابق</span>
          </Button>
        ) : <div />}

        {currentStep < 5 ? (
          <Button
            type="button"
            variant="gold"
            size="md"
            onClick={() => setCurrentStep(prev => prev + 1)}
          >
            <span>التالي</span>
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="gold"
            size="lg"
            isLoading={isLoading}
            onClick={handleSubmit}
          >
            <Sparkles className="w-4 h-4 ml-2" />
            <span>تأكيد والبدء في بيئة العمل</span>
          </Button>
        )}
      </div>
    </div>
  );
};

