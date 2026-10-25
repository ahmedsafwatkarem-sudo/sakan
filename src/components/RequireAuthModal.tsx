import React from 'react';
import { X, LogIn, UserPlus, Eye, MessageCircle, Phone, Compass, ShieldAlert } from 'lucide-react';

export type AuthRequiredAction = 'details' | 'whatsapp' | 'call' | 'booking' | 'general';

interface RequireAuthModalProps {
  actionType?: AuthRequiredAction;
  onClose: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const RequireAuthModal: React.FC<RequireAuthModalProps> = ({
  actionType = 'general',
  onClose,
  onOpenAuth
}) => {
  const getActionDetails = () => {
    switch (actionType) {
      case 'details':
        return {
          icon: <Eye className="w-5 h-5 text-amber-500" />,
          title: 'عرض تفاصيل العقار الكاملة',
          desc: 'للاطلاع على كافة مواصفات العقار ومعرض الصور والفيديو وحجز المعاينة، يرجى تسجيل الدخول أولاً.'
        };
      case 'whatsapp':
        return {
          icon: <MessageCircle className="w-5 h-5 text-emerald-500" />,
          title: 'محادثة واتساب مع المعلن',
          desc: 'لبدء محادثة واتساب فورية ومباشرة مع معلن العقار، يرجى تسجيل الدخول أولاً إلى حسابك.'
        };
      case 'call':
        return {
          icon: <Phone className="w-5 h-5 text-blue-500" />,
          title: 'الاتصال الهاتفي المباشر',
          desc: 'للاتصال الهاتفي المباشر بمعلن العقار وترتيب المعاينات، يرجى تسجيل الدخول أولاً.'
        };
      case 'booking':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
          title: 'طلب حجز موعد معاينة',
          desc: 'لإرسال طلب معاينة العقار والحصول على تأكيد الموعد، يرجى تسجيل الدخول أولاً.'
        };
      default:
        return {
          icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
          title: 'متابعة الإجراء المطلوب',
          desc: 'يرجى تسجيل الدخول أولاً للاستكمال والاستفادة من كافة خدمات منصة سكن بلس.'
        };
    }
  };

  const actionInfo = getActionDetails();

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative my-auto text-center transform transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Alert Icon */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center shadow-inner mb-4">
          <ShieldAlert className="w-9 h-9 stroke-[2.2]" />
        </div>

        {/* Main Header Requested by User */}
        <div className="inline-block bg-amber-100 text-amber-950 font-black text-xs px-3.5 py-1 rounded-full mb-2 border border-amber-200">
          تنبيه للزوار الكرام
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          حضرتك غير مسجل
        </h3>
        <p className="text-sm font-black text-amber-700 mt-1">
          من فضلك قم بتسجيل الدخول أولاً للاستكمال
        </p>

        {/* Action Specific Box */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-right flex items-start gap-3">
          <div className="p-2 bg-white rounded-xl shadow-xs shrink-0 border border-slate-200">
            {actionInfo.icon}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">{actionInfo.title}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              {actionInfo.desc}
            </p>
          </div>
        </div>

        {/* Browsing reassurance */}
        <div className="mt-3 py-2 px-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-right flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-[11px] text-emerald-800 font-bold">
            يمكنك تصفح جميع العقارات والبحث والفلترة بحرية تامة كزائر في أي وقت.
          </p>
        </div>

        {/* Actions buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuth('login');
            }}
            className="w-full bg-blue-950 hover:bg-blue-900 text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-lg shadow-blue-950/20 transition hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-amber-400" />
            <span>تسجيل الدخول بحسابك</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuth('register');
            }}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl text-xs sm:text-sm shadow-md transition hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>إنشاء حساب جديد في سكن بلس (مجاناً)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            متابعة التصفح كزائر
          </button>
        </div>
      </div>
    </div>
  );
};
