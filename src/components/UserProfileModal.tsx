import React from 'react';
import { X, User, Phone, Shield, PlusCircle, Building2, CheckCircle, Clock, Bell } from 'lucide-react';
import { UserProfile, Property } from '../types';

interface UserProfileModalProps {
  currentUser: UserProfile;
  userProperties: Property[];
  onClose: () => void;
  onOpenAddProperty: () => void;
  onSelectProperty: (property: Property) => void;
  onLogout: () => void;
  onOpenInterestsModal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  currentUser,
  userProperties,
  onClose,
  onOpenAddProperty,
  onSelectProperty,
  onLogout,
  onOpenInterestsModal
}) => {
  const roleNameArabic = {
    admin: 'مدير النظام (الإدارة)',
    owner: 'بائع / مالك عقار',
    renter: 'مؤجر عقارات',
    client: 'عميل وباحث عن سكن'
  }[currentUser.role] || currentUser.role;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Card */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-950 text-amber-400 flex items-center justify-center shadow-md font-black text-xl">
            {currentUser.name ? currentUser.name.charAt(0) : <User className="w-7 h-7" />}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">{currentUser.name || 'مستخدم سكن بلس'}</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
              <Phone className="w-3.5 h-3.5" />
              <span>{currentUser.phone}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-amber-600" />
                {roleNameArabic}
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                حساب نشط ومفعل
              </span>
            </div>
          </div>
        </div>

        {/* Interests & Notifications Card */}
        <div className="my-4 p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>تنبيهات المدن والاهتمامات العقارية</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.2 rounded-full">
                  مفعلة
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                تصلك تنبيهات فورية داخل التطبيق عند نشر أي عقار جديد يطابق مدنك المفضلة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenInterestsModal) onOpenInterestsModal();
            }}
            className="text-xs font-bold bg-white hover:bg-slate-50 text-blue-950 border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-xs shrink-0"
          >
            تعديل المدن
          </button>
        </div>

        {/* User Properties Section */}
        <div className="py-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-950" />
              <span>عقاراتي المعلنة ({userProperties.length})</span>
            </h4>
            <button
              onClick={() => {
                onClose();
                onOpenAddProperty();
              }}
              className="text-xs text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إضافة عقار جديد</span>
            </button>
          </div>

          {userProperties.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
              <p className="text-xs text-slate-500 font-bold mb-3">
                لم تقم بإضافة عقارات بعد على سكن بلس.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAddProperty();
                }}
                className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs"
              >
                أضف أول عقار لك الآن
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {userProperties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onClose();
                    onSelectProperty(p);
                  }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/70 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{p.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {Number(p.price).toLocaleString()} ج.م • {p.type === 'sale' ? 'للبيع' : 'للإيجار'}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {p.status === 'active' && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> نشط
                      </span>
                    )}
                    {p.status === 'pending' && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> مراجعة
                      </span>
                    )}
                    {p.status === 'sold' && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        مباع
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
          >
            تسجيل الخروج من الحساب
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
