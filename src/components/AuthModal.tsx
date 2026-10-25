import React, { useState } from 'react';
import { X, Phone, Lock, User, Sparkles, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { 
  MASTER_OWNER_PHONE,
  loginUserFast,
  registerUserFast
} from '../firebase';
import { UserProfile, UserRole } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onSuccessLogin: (profile: UserProfile) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialMode?: 'login' | 'register' | 'owner';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSuccessLogin,
  onShowToast,
  initialMode = 'login'
}) => {
  // Only two clean public tabs: login or register
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    initialMode === 'register' ? 'register' : 'login'
  );

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 9) {
      onShowToast('يرجى إدخال رقم هاتف صالح', 'error');
      return;
    }

    if (!password) {
      onShowToast('يرجى إدخال كلمة المرور', 'error');
      return;
    }

    if (activeTab === 'register' && password.length < 6) {
      onShowToast('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Direct Instant Login for existing accounts
      if (activeTab === 'login') {
        const result = await loginUserFast(cleanPhone, password);
        if (!result.success || !result.profile) {
          onShowToast(result.error || 'بيانات الدخول غير صحيحة، يرجى التأكد من رقم الهاتف وكلمة المرور', 'error');
          setIsSubmitting(false);
          return;
        }

        onSuccessLogin(result.profile);
        onShowToast(
          cleanPhone === MASTER_OWNER_PHONE
            ? 'مرحباً بك يا باشمهندس عبدالله! تم تسجيل دخول المالك والمسؤول بنجاح.'
            : 'مرحباً بك مجدداً! تم تسجيل الدخول بنجاح.',
          'success'
        );
        onClose();
        return;
      }

      // Direct Instant Registration for new accounts
      if (activeTab === 'register') {
        const result = await registerUserFast(cleanPhone, password, name, role);
        if (!result.success || !result.profile) {
          onShowToast(result.error || 'تعذر إنشاء الحساب', 'error');
          if (result.error?.includes('مسجل بالفعل')) {
            setActiveTab('login');
          }
          setIsSubmitting(false);
          return;
        }

        onSuccessLogin(result.profile);
        if (result.profile.publishingRequestStatus === 'pending') {
          onShowToast('تم إنشاء الحساب بنجاح! تم إرسال طلب للمالك لاعتماد صلاحيات النشر.', 'info');
        } else {
          onShowToast('تم إنشاء حسابك بنجاح ومرحباً بك في سكن بلس!', 'success');
        }
        onClose();
        return;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع، يرجى المحاولة ثانية';
      onShowToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 left-5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition disabled:opacity-40"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center pt-2 pb-5">
          <div className="w-12 h-12 bg-blue-950 text-amber-400 rounded-2xl mx-auto flex items-center justify-center shadow-md mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            {activeTab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {activeTab === 'login'
              ? 'أدخل رقم الهاتف وكلمة المرور للدخول المباشر إلى حسابك'
              : 'أدخل بياناتك لإنشاء حساب جديد والتمتع بكافة خدمات سكن بلس'}
          </p>
        </div>

        {/* Clean Two-Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => { setActiveTab('login'); }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-blue-950 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </button>
          
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => { setActiveTab('register'); }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-blue-950 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إنشاء حساب جديد</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name only in Register Mode */}
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none disabled:opacity-60"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>
          )}

          {/* Username / Phone Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم المستخدم (رقم الهاتف)
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                disabled={isSubmitting}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 0100XXXXXXX"
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none disabled:opacity-60"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none disabled:opacity-60"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          {/* Account Role only in Register Mode */}
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحساب</label>
              <select
                value={role}
                disabled={isSubmitting}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none cursor-pointer disabled:opacity-60"
              >
                <option value="client">عميل (بحث ومعاينة عقارات)</option>
                <option value="owner">مالك / بائع عقارات</option>
                <option value="renter">مؤجر وحدات سكنية</option>
              </select>
            </div>
          )}

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white font-black py-3 rounded-2xl text-sm shadow-xl transition mt-2 flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-blue-900/90 cursor-wait'
                : 'bg-gradient-to-r from-blue-950 to-blue-900 hover:from-blue-900 hover:to-blue-800 active:scale-[0.98] cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>
                  {activeTab === 'login'
                    ? 'جاري التحقق وتسجيل الدخول...'
                    : 'جاري إنشاء الحساب والتأكيد...'}
                </span>
              </>
            ) : activeTab === 'login' ? (
              <>
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>تسجيل الدخول المباشر</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>تأكيد إنشاء الحساب فوراً</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Link */}
        <div className="mt-5 text-center">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setActiveTab(activeTab === 'login' ? 'register' : 'login')}
            className="text-xs text-amber-700 hover:text-amber-800 font-black hover:underline disabled:opacity-50"
          >
            {activeTab === 'login'
              ? 'ليس لديك حساب؟ إنشاء حساب جديد الآن'
              : 'لديك حساب مسجل بالفعل؟ تسجيل الدخول المباشر'}
          </button>
        </div>

      </div>
    </div>
  );
};
