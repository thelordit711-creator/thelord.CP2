import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompanyVault } from '../models/CompanyVault.model';
import { PayoutOrder } from '../models/PayoutOrder.model';
import { Task } from '../models/Task.model';
import { User } from '../models/User.model';
import { AccessRole } from '@lord/shared-types';

export class TheLordAIService {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaMockKeyForDevelopment');

  /**
   * Primary Chat with TheLordAI using Gemini 2.5 Flash
   */
  public static async chat(
    userMessage: string,
    role: AccessRole,
    userId: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  ): Promise<string> {
    const isSuperAdmin = role === 'SUPER_ADMIN';

    // System instruction custom tailored with Zero-Leakage Financial Firewall
    let systemInstruction = `
أنت المساعد الذكي "TheLordAI" الخاص بنظام إدارة العمليات والموارد THE LORD OF CRYPTO Control Panel.
مهمتك مساعدة الفريق في التخطيط، تنظيم المهام، صناعة المحتوى، وإدارة العمليات بكفاءة واحترافية عالية.
    `;

    if (isSuperAdmin) {
      systemInstruction += `
أنت الآن في الوضع التنفيذي الكامل (Admin Executive AI). لديك وصول لكافة التحليلات التنفيذية والمالية، ومساعدة المسؤول في مراقبة المهام وتلخيص الاجتماعات والتقارير اليومية.
      `;
    } else {
      systemInstruction += `
أنت الآن في الوضع الإنتاجي للموظف (Employee Productivity AI). مهمتك مساعدة الموظف في تحسين جودة تسليماته، صياغة تقاريره، ومساعدته حسب تخصصه.
⚠️ تنبيه أمني صارم (الجدار الناري المالي): لا تملك أي صلاحية للوصول للأرصدة العامة أو الخزينة أو كشوفات رواتب الزملاء، ولا تجب عن أي استفسار مالي خاص بالشركة.
      `;
    }

    try {
      if (!process.env.GEMINI_API_KEY) {
        // High-quality mock response for local development when API key is not configured yet
        return isSuperAdmin
          ? `[TheLordAI التنفيذي]: مرحباً بك يا لورد. جاهز لمساعدتك في إنشاء المهام، تدقيق المراحل، ومتابعة الأداء المالي والتشغيلي لليوم.`
          : `[TheLordAI الإنتاجي]: أهلاً بك يا بطل! أنا جاهز لمساعدتك في صياغة محتواك، مراجعة مراحل مهامك والتأكد من استيفاء كافة المتطلبات قبل تسليمها للمسؤول.`;
      }

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        systemInstruction
      });

      const chatSession = model.startChat({
        history: history.length ? history : undefined
      });

      const result = await chatSession.sendMessage(userMessage);
      return result.response.text();
    } catch (error) {
      console.error('TheLordAI generation error:', error);
      return 'عذراً، حدث خطأ مؤقت أثناء معالجة طلبك عبر TheLordAI. يرجى المحاولة لاحقاً.';
    }
  }
}

