import React, { useState } from 'react';
import { Phone, Mail, MapPin, MessageCircle, ShieldCheck, Heart, Smartphone, Download } from 'lucide-react';
import { AppDownloadModal } from './AppDownloadModal';

interface FooterProps {
  onSelectCity: (city: string) => void;
  onSelectCategory: (category: string) => void;
  onOpenAddProperty: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCity,
  onSelectCategory,
  onOpenAddProperty,
  onShowToast
}) => {
  const [downloadPlatform, setDownloadPlatform] = useState<'android' | 'ios' | null>(null);
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-md border border-amber-400/30 bg-slate-900 shrink-0">
                <img 
                  src="/sakan-logo.svg" 
                  alt="شعار سكن بلس" 
                  className="w-full h-full object-contain p-0.5" 
                />
              </div>
              <span className="text-2xl font-black text-white">
                سكن <span className="text-amber-500">بلس</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              سكن بلس هي منصتك العقارية الذكية والموثوقة في مصر. نوصل الملاك والمشترين والمستأجرين مباشرة دون تعقيد أو عمولات مبالغ فيها، مع دعم فني مستمر.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <a
                href="https://wa.me/201007775402?text=مرحباً%20سكن%20بلس"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب: 01007775402</span>
              </a>
            </div>
          </div>

          {/* Quick Real Estate Links */}
          <div>
            <h4 className="text-sm font-black text-white mb-4">أبرز المناطق</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              {[
                'مصيف بلطيم (جميع الشواطئ)، كفر الشيخ',
                'مارينا دلتا، كفر الشيخ',
                'قرية الصيادلة، كفر الشيخ',
                'قرية مارينا بلو بيتش، كفر الشيخ',
                'التجمع الخامس، القاهرة الجديدة',
                'الشيخ زايد، الجيزة'
              ].map((city) => (
                <li key={city}>
                  <button
                    onClick={() => {
                      onSelectCity(city);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                    className="hover:text-amber-400 transition"
                  >
                    عقارات {city}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-black text-white mb-4">أنواع العقارات</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('villa');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-400 transition"
                >
                  فلل وقصور مستقلة
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('apartment');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-400 transition"
                >
                  شقق سكنية واستوديوهات
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('duplex');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-400 transition"
                >
                  دوبلكس وبنتهاوس
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('chalet');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-400 transition"
                >
                  شاليهات ومصايف
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('commercial');
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-400 transition"
                >
                  مقرات ومحلات تجارية وإدارية
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Hotline & Support */}
          <div>
            <h4 className="text-sm font-black text-white mb-4">خدمة العملاء والإدارة</h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500" />
                <a href="tel:01007775402" className="hover:text-white font-mono font-bold">
                  01007775402
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <a
                  href="https://wa.me/201007775402"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 font-mono font-bold"
                >
                  201007775402+
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>القاهرة، جمهورية مصر العربية</span>
              </div>
              <div className="pt-2">
                <button
                  onClick={onOpenAddProperty}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs transition shadow-md"
                >
                  أعلن عن عقارك معنا مجاناً
                </button>
              </div>

              {/* Quick App Store links in contact column */}
              <div className="pt-3 border-t border-slate-800/80">
                <span className="block text-[11px] font-bold text-slate-400 mb-2">تطبيقات الجوال:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadPlatform('android')}
                    className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-emerald-500/50 flex items-center justify-center gap-1.5 transition text-[11px] font-bold text-slate-300"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-500 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0001s.4482-1.0001.9993-1.0001c.552 0 .9997.4486.9997 1.0001s-.4477 1.0001-.9997 1.0001m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0001s.4482-1.0001.9993-1.0001c.552 0 .9997.4486.9997 1.0001s-.4477 1.0001-.9997 1.0001m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8 12 8s-3.5902.4116-5.1368 1.4498L4.8409 5.9467a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.6667 0 15.06 0 19.0667h24c0-4.0067-2.6889-7.4-6.1185-9.7453" />
                    </svg>
                    <span>أندرويد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDownloadPlatform('ios')}
                    className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 hover:border-amber-400/50 flex items-center justify-center gap-1.5 transition text-[11px] font-bold text-slate-300"
                  >
                    <svg className="w-3.5 h-3.5 text-white fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.76 1.06-1.82.94-2.88-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.75-.95 2.78 1.02.08 2.05-.51 2.68-1.27z" />
                    </svg>
                    <span>آيفون</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Mobile Apps Download Section: أندرويد & آيفون */}
        <div className="mt-12 mb-8 py-6 px-6 sm:px-8 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-right flex-col sm:flex-row">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1 flex-wrap">
                <span className="text-base sm:text-lg font-black text-white">حمّل تطبيق سكن بلس على هاتفك الذكي</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  مجاني وسريع
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                تصفح آلاف العقارات والشاليهات، واستقبل الإشعارات الفورية بالوحدات الجديدة وتواصل مباشرة مع المعلنين من هاتفك.
              </p>
            </div>
          </div>

          {/* Android & iPhone Download Badges */}
          <div className="flex items-center gap-3.5 flex-wrap justify-center shrink-0">
            {/* Google Play / Android Badge */}
            <button
              type="button"
              onClick={() => setDownloadPlatform('android')}
              className="group relative flex items-center gap-3 bg-black hover:bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-slate-700 hover:border-emerald-500/60 shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 active:scale-95 text-right cursor-pointer"
              title="تثبيت تطبيق سكن بلس للأندرويد"
            >
              <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                {/* Official Google Play Triangle SVG */}
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M3.6 2.3l11.4 11.4-3.4 3.4L2.3 3.6c.4-.7 1-.9 1.3-1.3z" />
                  <path fill="#34A853" d="M15 13.7l3.4-3.4L5.6 2.5 15 13.7z" />
                  <path fill="#FBBC05" d="M21.7 10.3l-3.3 3.4-3.4-3.4 3.3-3.3c.6.4 1.7 1.4 3.4 3.3z" />
                  <path fill="#EA4335" d="M15 13.7L5.6 24.9 18.4 17.1l-3.4-3.4z" />
                </svg>
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 font-medium leading-tight">متاح للأندرويد على</span>
                <span className="block text-sm font-black text-white group-hover:text-emerald-400 transition font-sans">
                  Google Play
                </span>
              </div>
            </button>

            {/* Apple App Store / iPhone Badge */}
            <button
              type="button"
              onClick={() => setDownloadPlatform('ios')}
              className="group relative flex items-center gap-3 bg-black hover:bg-slate-900 text-white px-4 py-2.5 rounded-2xl border border-slate-700 hover:border-amber-400/60 shadow-lg hover:shadow-amber-500/10 transition-all duration-200 active:scale-95 text-right cursor-pointer"
              title="تثبيت تطبيق سكن بلس للآيفون"
            >
              <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                {/* Official Apple Logo SVG */}
                <svg className="w-6 h-6 fill-current text-white group-hover:text-amber-400 transition" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.76 1.06-1.82.94-2.88-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.75-.95 2.78 1.02.08 2.05-.51 2.68-1.27z" />
                </svg>
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 font-medium leading-tight">حمّل للآيفون من</span>
                <span className="block text-sm font-black text-white group-hover:text-amber-300 transition font-sans">
                  App Store
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4 border-t border-slate-900">
          <div>
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} منصة سكن بلس (Sakan Plus)
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <span>بكل فخر لخدمة القطاع العقاري المصري</span>
          </div>
        </div>
      </div>

      {/* App Download Modal */}
      {downloadPlatform && (
        <AppDownloadModal
          initialPlatform={downloadPlatform}
          onClose={() => setDownloadPlatform(null)}
          onShowToast={onShowToast}
        />
      )}
    </footer>
  );
};
