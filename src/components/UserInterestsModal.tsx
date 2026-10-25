import React, { useState } from 'react';
import { X, MapPin, SlidersHorizontal, Check, Bell, Sparkles, Building2 } from 'lucide-react';
import { UserPreferences, Property } from '../types';
import { POPULAR_INTEREST_CITIES, checkPropertyMatchesPreferences } from '../utils/notificationUtils';

interface UserInterestsModalProps {
  initialPreferences: UserPreferences;
  properties: Property[];
  onClose: () => void;
  onSavePreferences: (prefs: UserPreferences) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UserInterestsModal: React.FC<UserInterestsModalProps> = ({
  initialPreferences,
  properties,
  onClose,
  onSavePreferences,
  onShowToast
}) => {
  const [selectedCities, setSelectedCities] = useState<string[]>(
    initialPreferences.preferredCities || ['مصيف بلطيم']
  );
  const [preferredType, setPreferredType] = useState<'all' | 'sale' | 'rent'>(
    initialPreferences.preferredType || 'all'
  );
  const [notifyOnMatch, setNotifyOnMatch] = useState<boolean>(
    initialPreferences.notifyOnMatch ?? true
  );

  const handleToggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      if (selectedCities.length === 1) {
        onShowToast('يجب اختيار مدينة واحدة على الأقل لتفعيل التنبيهات', 'info');
        return;
      }
      setSelectedCities(selectedCities.filter((c) => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
  };

  const handleSelectAllKafrElSheikh = () => {
    const kfsCoastal = POPULAR_INTEREST_CITIES.filter(
      (c) => c.includes('بلطيم') || c.includes('مارينا') || c.includes('الصيادلة') || c.includes('كفر الشيخ')
    );
    const allIncluded = kfsCoastal.every((b) => selectedCities.includes(b));
    if (allIncluded) {
      setSelectedCities(selectedCities.filter((c) => !kfsCoastal.includes(c)));
    } else {
      const merged = Array.from(new Set([...selectedCities, ...kfsCoastal]));
      setSelectedCities(merged);
    }
  };

  const handleSave = () => {
    const updated: UserPreferences = {
      preferredCities: selectedCities,
      preferredType,
      notifyOnMatch
    };
    onSavePreferences(updated);
    onShowToast('تم حفظ اهتماماتك وتحديث إعدادات التنبيهات بنجاح!', 'success');
    onClose();
  };

  // Calculate live matching properties
  const tempPrefs: UserPreferences = {
    preferredCities: selectedCities,
    preferredType,
    notifyOnMatch
  };

  const matchingCount = properties.filter((p) => {
    const { matches } = checkPropertyMatchesPreferences(p, tempPrefs);
    return matches;
  }).length;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative my-auto text-right">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              اهتماماتي العقارية وإشعارات المدن
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              حدد مدنك المفضلة ونوع العقار ليصلك تنبيه فوري داخل التطبيق عند نشر أي عقار يطابقها.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-6">
          
          {/* Notifications Master Toggle */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${notifyOnMatch ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <div>
                <span className="text-xs font-black text-slate-900">
                  تفعيل التنبيهات الفورية للعقارات المطابقة
                </span>
                <p className="text-[11px] text-slate-500">
                  إرسال إشعار داخل التطبيق بمجرد إضافة عقار جديد في مدنك
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNotifyOnMatch(!notifyOnMatch)}
              className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                notifyOnMatch ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  notifyOnMatch ? '-translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section 1: Preferred Cities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>المدن والشواطئ المفضلة ({selectedCities.length} محددة)</span>
              </label>

              <button
                type="button"
                onClick={handleSelectAllKafrElSheikh}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 transition underline underline-offset-2"
              >
                تحديد / إلغاء قرى وشواطئ كفر الشيخ
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              انقر على أي مدينة لإضافتها أو إزالتها من قائمة التنبيهات الخاصة بك:
            </p>

            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
              {POPULAR_INTEREST_CITIES.map((city) => {
                const isSelected = selectedCities.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleToggleCity(city)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-blue-950 text-white border-blue-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                    <span>{city}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Preferred Property Type */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-950" />
              <span>نوع المعاملة المرغوبة</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreferredType('all')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  preferredType === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                الكل (بيع وإيجار)
              </button>
              <button
                type="button"
                onClick={() => setPreferredType('sale')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  preferredType === 'sale'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                عقارات للبيع فقط
              </button>
              <button
                type="button"
                onClick={() => setPreferredType('rent')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                  preferredType === 'rent'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                عقارات للإيجار فقط
              </button>
            </div>
          </div>

          {/* Matching Status Info Box */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-950">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>العقارات المطابقة لاختياراتك الحالية الآن:</span>
            </div>
            <span className="bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full font-mono font-black">
              {matchingCount} عقار
            </span>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-blue-950 hover:bg-blue-900 text-white font-black py-3 rounded-2xl text-xs sm:text-sm shadow-md transition active:scale-98"
          >
            حفظ الاهتمامات وتفعيل التنبيهات
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
};
