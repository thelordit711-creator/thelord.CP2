# 🦁 THE LORD OF CRYPTO — Control Panel (C.P)

> **All-in-One Enterprise Workspace & Simple Financial ERP**  
> مخصص لإدارة فرق التداول، التسويق، صناعة المحتوى، البرمجة، والدعم الفني، مع عزل أمني تام لوحدة الصرف المالي (الصندوق)، ودعم الدفع المزدوج عبر **شبكة BEP20 (USDT)** والمحافظ المحلية **(محفظة جيب Jeeb ومحفظة جوالي Jawali)** عبر رقم الهاتف.

---

## 💎 1. الهوية البصرية ونظام الألوان (`globals.css`)

| المتغير العام | الكود اللوني | الاستخدام في الواجهة |
|---|---|---|
| `--bg-obsidian-primary` | `#07090E` | الخلفية الرئيسية الداكنة فائقة التباين |
| `--bg-card-surface` | `#0F141C` | خلفيات البطاقات والنوافذ المنبثقة |
| `--lord-gold-primary` | `#D4AF37` | الأزرار الرئيسية، الشعار، والحواف الذهبية |
| `--lord-gold-hover` | `#F3E5AB` | حالات التمرير والتوهج الذهبي |
| `--cyber-blue-accent` | `#00A8FF` | الروابط، المؤشرات التحليلية، والمساعد الذكي |
| `--status-processing` | `#F59E0B` | شارة حالة الصندوق: `قيد التنفيذ` |
| `--status-disbursed` | `#10B981` | شارة حالة الصندوق: `تم الصرف` وحالة الاتصال |
| `--status-danger` | `#EF4444` | الخصومات المالية والإنذارات الإدارية |

---

## 🏛️ 2. الهيكلية المعمارية (Monorepo)

```text
the-lord-of-crypto-cp/
├── apps/
│   ├── web/                    # Next.js 14 App Router (Frontend)
│   │   ├── messages/           # الترجمة العربية والانجليزية (next-intl)
│   │   └── src/
│   │       ├── app/[locale]/
│   │       │   ├── (auth)/onboarding/     # معالج تسجيل الموظف وربط BEP20 وجيب/جوالي
│   │       │   ├── (admin)/dashboard/     # لوحة قيادة المسؤول والخزينة
│   │       │   ├── (employee)/workspace/  # مساحة عمل الموظف والمراحل والتسجيل الصوتي
│   │       │   └── (treasury)/payout-desk/# شاشة الصندوق المعزولة (قيد التنفيذ / تم الصرف)
│   │       ├── components/
│   │       │   ├── treasury/              # IsolatedPayoutCard (BEP20 / Jeeb / Jawali)
│   │       │   ├── voice/                 # DirectVoiceRecorder 🎙️
│   │       │   └── ai/                    # TheLordAIFloatingAssistant (Gemini Flash)
│   │       └── store/                     # Redux Toolkit & RTK Query
│   │
│   └── api/                    # Express + TypeScript + Mongoose + Socket.io (Backend)
│       └── src/
│           ├── models/         # Mongoose Schemas (User, Task, PayoutOrder, Vault, Ledger)
│           ├── routes/         # REST API Routes
│           ├── controllers/    # Domain Controllers
│           ├── services/       # AccountingService, SocketService, TheLordAI
│           └── middlewares/    # verifyKindeJWT, rbacGuard, treasuryIsolationGuard
│
└── packages/
    └── shared-types/           # TypeScript Types & Interfaces الموحدة
```

---

## 📱 3. منظومة الدفع المزدوجة (BEP20 USDT + محفظة جيب وجوالي)

1. **BEP20 USDT:** يتم التحقق من صحة عنوان المحفظة عبر Checksum (0x + 40 حرف ست عشري). وتعرض شاشة الصندوق العنوان مع زر نسخ ورمز QR مباشر.
2. **محفظة جيب (`Jeeb Wallet`):** تحويل فوري عبر رقم الهاتف المسجل (7XXXXXXXX) واسم المستفيد الرباعي لمطابقته قبل التحويل.
3. **محفظة جوالي (`Jawali Wallet`):** تحويل فوري عبر رقم الهاتف المسجل (7XXXXXXXX) واسم المستفيد الرباعي.

---

## ⚡ 4. التشغيل المحلي (Getting Started)

### المتطلبات الأساسية
- Node.js >= 18.x
- MongoDB يعمل محلياً أو URI سحابي (MongoDB Atlas)

### خطوات التشغيل:
1. تثبيت الحزم:
   ```bash
   npm install
   ```
2. تشغيل الـ Backend (API):
   ```bash
   npm run dev:api
   # Server runs on http://localhost:5000
   ```
3. تشغيل الـ Frontend (Web):
   ```bash
   npm run dev:web
   # Next.js runs on http://localhost:3000
   ```

---

## 🛡️ 5. عزل شاشة الصندوق (Zero-Access Isolation)
موظف الصندوق يعمل من جهاز مستقل بحساب `TREASURY` محجوب برمجياً عن رؤية أي تفاصيل داخلية للمهام أو التقارير أو الاجتماعات. تقتصر شاشته على:
1. قراءة أوامر الصرف المعتمدة (المبلغ + عنوان BEP20 أو رقم هاتف جيب/جوالي).
2. ضغط زر `[قيد التنفيذ]` (إشعار فوري للموظف والمسؤول).
3. ضغط زر `[تم الصرف]` وإدخال `TxHash` أو رقم الحوالة، ليتم خصم المبلغ آلياً ولحظياً من رصيد الصندوق والميزانية العامة.

