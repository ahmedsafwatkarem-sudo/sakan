import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  Check, 
  Share2, 
  PlusSquare, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Star,
  QrCode,
  Layers
} from 'lucide-react';

interface AppDownloadModalProps {
  initialPlatform?: 'android' | 'ios';
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  initialPlatform = 'android',
  onClose,
  onShowToast
}) => {
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios'>(initialPlatform);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Listen for PWA beforeinstallprompt on supported Android/Chrome browsers
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        if (onShowToast) onShowToast('جاري تثبيت تطبيق سكن بلس على هاتفك...', 'success');
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Direct instructions / fallback
      if (onShowToast) {
        onShowToast('يمكنك تثبيت التطبيق مباشرة عبر قائمة المتصفح (⋮) ثم اختيار "تثبيت التطبيق"', 'info');
      }
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sakanplus.com';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative my-auto text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border border-amber-400/30 bg-slate-900 flex items-center justify-center shrink-0">
            <img src="/sakan-logo.svg" alt="سكن بلس" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">تطبيق سكن بلس للجوال</h3>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                مجاني 100%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              تصفح أسرع، إشعارات فورية، وإمكانية الوصول بدون إنترنت
            </p>
          </div>
        </div>

        {/* Platform Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl my-5">
          <button
            type="button"
            onClick={() => setActivePlatform('android')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activePlatform === 'android'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {/* Android Icon */}
            <svg className="w-4 h-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0001s.4482-1.0001.9993-1.0001c.552 0 .9997.4486.9997 1.0001s-.4477 1.0001-.9997 1.0001m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0001s.4482-1.0001.9993-1.0001c.552 0 .9997.4486.9997 1.0001s-.4477 1.0001-.9997 1.0001m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8 12 8s-3.5902.4116-5.1368 1.4498L4.8409 5.9467a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.6667 0 15.06 0 19.0667h24c0-4.0067-2.6889-7.4-6.1185-9.7453" />
            </svg>
            <span>نظام أندرويد (Android)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlatform('ios')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activePlatform === 'ios'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {/* Apple Icon */}
            <svg className="w-4 h-4 text-slate-900 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.76 1.06-1.82.94-2.88-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.75-.95 2.78 1.02.08 2.05-.51 2.68-1.27z" />
            </svg>
            <span>نظام آبل آيفون (iOS)</span>
          </button>
        </div>

        {/* ANDROID CONTENT */}
        {activePlatform === 'android' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-950 mb-0.5">تثبيت فوري على أجهزة أندرويد</h4>
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  يعمل التطبيق بتوافق كامل كتطبيق أصلي (PWA WebApp) لا يستهلك ذاكرة الجهاز ويدعم الإشعارات الفورية.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">1</span>
                <span>انقر على زر "تثبيت تطبيق أندرويد الآن" بالأسفل.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">2</span>
                <span>أو افتح خيارات متصفح كروم (⋮) ثم اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">3</span>
                <span>سيظهر رمز سكن بلس على شاشتك الرئيسية فوراً.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleInstallAndroid}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-slate-950/20 active:scale-95"
              >
                {/* Google Play Triangle */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M3.6 2.3l11.4 11.4-3.4 3.4L2.3 3.6c.4-.7 1-.9 1.3-1.3z" />
                  <path fill="#34A853" d="M15 13.7l3.4-3.4L5.6 2.5 15 13.7z" />
                  <path fill="#FBBC05" d="M21.7 10.3l-3.3 3.4-3.4-3.4 3.3-3.3c.6.4 1.7 1.4 3.4 3.3z" />
                  <path fill="#EA4335" d="M15 13.7L5.6 24.9 18.4 17.1l-3.4-3.4z" />
                </svg>
                <span>تثبيت تطبيق أندرويد الآن (مجاناً)</span>
              </button>
            </div>
          </div>
        )}

        {/* IOS CONTENT */}
        {activePlatform === 'ios' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white mb-0.5">تثبيت تطبيق سكن بلس على آيفون وآيباد</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  يمكنك تحويل الموقع إلى تطبيق كامل على شاشة الآيفون بخطوات بسيطة عبر متصفح سفاري (Safari):
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-bold block text-slate-900">اضغط على زر المشاركة (Share):</span>
                  <span className="text-[11px] text-slate-500">أيقونة المربع مع السهم للأعلى أسفل شاشة متصفح سفاري.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-bold block text-slate-900">اختر "إضافة إلى الشاشة الرئيسية":</span>
                  <span className="text-[11px] text-slate-500">مرر للأسفل واضغط على خيار (Add to Home Screen ⊞).</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-bold block text-slate-900">اضغط على "إضافة" (Add):</span>
                  <span className="text-[11px] text-slate-500">سيظهر تطبيق سكن بلس بأيقونته الرسمية على شاشة جهازك كأي تطبيق آخر.</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>يعمل التطبيق بشاشة كاملة وبدون شريط المتصفح لتجربة استخدام فائقة السلاسة.</span>
            </div>
          </div>
        )}

        {/* Feature Badges Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>آمن ومحدث تلقائياً</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>تقييم 4.9 من المستخدمين</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>حجم فائق الخفة (&lt; 2MB)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
