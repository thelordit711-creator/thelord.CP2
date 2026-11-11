export interface TaskRequiredInputDraft {
  fieldLabel: string;
  expectedType: string;
  isMandatory: boolean;
}

export interface TaskStageDraft {
  stageOrder: number;
  stageTitle: string;
  instructions: string;
  requiredInputs: TaskRequiredInputDraft[];
}

export type StageTemplateKey = 'TRADING' | 'MEDIA' | 'DEV' | 'SINGLE';

export const STAGE_TEMPLATE_PRESETS: Record<
  StageTemplateKey,
  { toastMessage: string; stages: TaskStageDraft[] }
> = {
  TRADING: {
    toastMessage: 'تم تطبيق قالب مراحل التداول وصفقات VIP 📈',
    stages: [
      {
        stageOrder: 1,
        stageTitle: 'تحضير التحليل الفني ولقطة الشارت',
        instructions: 'تحديد مستويات الدخول والوقف بدقة عالية ونسبة مخاطرة 1:3',
        requiredInputs: [{ fieldLabel: 'لقطة شاشة الشارت الفني', expectedType: 'IMAGE', isMandatory: true }]
      },
      {
        stageOrder: 2,
        stageTitle: 'إنتاج البوستر الإعلاني والمونتاج',
        instructions: 'تصميم البوستر الملكي أو فيديو ريلز متوافق مع هوية The Lord',
        requiredInputs: [{ fieldLabel: 'ملف التصميم النهائي أو الفيديو', expectedType: 'IMAGE', isMandatory: true }]
      },
      {
        stageOrder: 3,
        stageTitle: 'النشر والتفاعل الرسمي وإحصائيات المشاهدات',
        instructions: 'إرفاق رابط المنشور وتقرير الوصول الأولي',
        requiredInputs: [{ fieldLabel: 'رابط المنشور الرسمي', expectedType: 'URL', isMandatory: true }]
      }
    ]
  },
  MEDIA: {
    toastMessage: 'تم تطبيق قالب مراحل المونتاج والميديا 🎬',
    stages: [
      {
        stageOrder: 1,
        stageTitle: 'تجهيز النص والسيناريو الإعلاني',
        instructions: 'صياغة هوك قوي ومحتوى جذاب متوافق مع هوية The Lord',
        requiredInputs: [{ fieldLabel: 'ملف أو نص السيناريو', expectedType: 'TEXT', isMandatory: true }]
      },
      {
        stageOrder: 2,
        stageTitle: 'المونتاج والتصدير النهائي 1080p',
        instructions: 'مونتاج الفيديو مع المؤثرات الصوتية وشعار The Lord',
        requiredInputs: [{ fieldLabel: 'الفيديو النهائي المُمنتج', expectedType: 'VIDEO', isMandatory: true }]
      },
      {
        stageOrder: 3,
        stageTitle: 'النشر والترويج ورصد التفاعل',
        instructions: 'رفع الفيديو على القناة أو المنصة ومتابعة أول ساعة تفاعل',
        requiredInputs: [{ fieldLabel: 'رابط الفيديو المنشور', expectedType: 'URL', isMandatory: true }]
      }
    ]
  },
  DEV: {
    toastMessage: 'تم تطبيق قالب مراحل التطوير والبرمجة 💻',
    stages: [
      {
        stageOrder: 1,
        stageTitle: 'دراسة المتطلبات وربط الـ API',
        instructions: 'فحص التوثيق وتجربة الاتصال ونقاط النهاية (Endpoints)',
        requiredInputs: [{ fieldLabel: 'مستند المواصفات الفنية أو التقرير', expectedType: 'DOCUMENT', isMandatory: true }]
      },
      {
        stageOrder: 2,
        stageTitle: 'كتابة الكود البرمجي واختبار البوت',
        instructions: 'تطوير الوظيفة واختبار الأداء والتعامل مع أخطاء الشبكة',
        requiredInputs: [{ fieldLabel: 'الكود البرمجي المكتوب', expectedType: 'CODE_SNIPPET', isMandatory: true }]
      },
      {
        stageOrder: 3,
        stageTitle: 'النشر على السيرفر ومراقبة الـ Logs',
        instructions: 'رفع الكود على السيرفر الحي والتأكد من استقرار التشغيل',
        requiredInputs: [{ fieldLabel: 'رابط السيرفر أو تقرير النشر', expectedType: 'URL', isMandatory: true }]
      }
    ]
  },
  SINGLE: {
    toastMessage: 'تم تطبيق قالب المرحلة المباشرة ⚡',
    stages: [
      {
        stageOrder: 1,
        stageTitle: 'تنفيذ المهمة وتسليم المخرجات كاملة',
        instructions: 'قم بإنجاز متطلبات المهمة ورفع الإثبات النهائي للاعتماد المباشر',
        requiredInputs: [{ fieldLabel: 'ملف الإنجاز أو الرابط', expectedType: 'ANY_FILE', isMandatory: true }]
      }
    ]
  }
};

export const DEPARTMENT_OPTIONS = [
  { value: 'TRADING', label: '📈 قسم التداول والتحليلات الفنية (TRADING)' },
  { value: 'MARKETING', label: '🎯 قسم التسويق والحملات الإعلانية (MARKETING)' },
  { value: 'CONTENT_MEDIA', label: '🎬 قسم المونتاج والمحتوى والتصميم (CONTENT_MEDIA)' },
  { value: 'DEVELOPMENT', label: '💻 قسم البرمجة وتطوير البوتات (DEVELOPMENT)' },
  { value: 'SUPPORT', label: '🛡️ قسم خدمة العملاء والدعم الفني (SUPPORT)' },
  { value: 'ALL_DEPARTMENTS', label: '🌐 كافة أقسام وكوادر المنظومة (ALL)' }
] as const;

export const EXPECTED_INPUT_OPTIONS = [
  { value: 'IMAGE', label: '📸 صورة / لقطة شاشة شارت' },
  { value: 'VIDEO', label: '🎬 فيديو مونتاج / ريلز' },
  { value: 'URL', label: '🔗 رابط منشور رسمي / URL' },
  { value: 'DOCUMENT', label: '📄 مستند وثائقي / PDF' },
  { value: 'CODE_SNIPPET', label: '💻 كود برمجي / سكريبت' },
  { value: 'VOICE_NOTE', label: '🎙️ تسجيل صوتي مباشر' },
  { value: 'TEXT', label: '✍️ تقرير نصي وشرح' },
  { value: 'ANY_FILE', label: '📁 أي ملف أو مرفق' }
] as const;

