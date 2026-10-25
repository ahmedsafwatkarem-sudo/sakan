import React from 'react';
import { Search, MapPin, Building2, Tag, SlidersHorizontal, Sparkles, PhoneCall } from 'lucide-react';
import { CATEGORY_LABELS, CITIES } from '../data/mockProperties';
import { PropertyType } from '../types';

interface HeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedType: PropertyType | 'all';
  setSelectedType: (type: PropertyType | 'all') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  maxPrice: number;
  setMaxPrice: (price: number) => void;
  onResetFilters: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  selectedCategory,
  setSelectedCategory,
  selectedCity,
  setSelectedCity,
  maxPrice,
  setMaxPrice,
  onResetFilters
}) => {
  return (
    <div className="relative pt-24 pb-14 bg-gradient-to-b from-blue-950 via-slate-900 to-slate-900 text-white overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10 pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-amber-300 text-xs font-bold mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>المنصة العقارية الأكثر موثوقية في مصر</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight sm:leading-snug text-white">
            ابحث عن بيتك المثالي أو استثمارك القادم مع{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
              سكن بلس
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            تصفح آلاف العقارات المعروضة للبيع والإيجار مباشرة من الملاك والشركات المعتمدة، مع تواصل فوري عبر الواتساب والمكالمات.
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <a
              href="https://wa.me/201007775402?text=مرحباً%20سكن%20بلس%20أريد%20معلومات%20عن%20العقارات"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl border border-emerald-400/30 transition shadow-lg shadow-emerald-950/40"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>تواصل مباشر: 01007775402</span>
            </a>
          </div>
        </div>

        {/* Floating Search & Filter Box */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-100 text-slate-900 max-w-5xl mx-auto">
          {/* Main tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                  selectedType === 'all'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('sale')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                  selectedType === 'sale'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                عقارات للبيع
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('rent')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition ${
                  selectedType === 'rent'
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                عقارات للإيجار
              </button>
            </div>

            {(searchQuery || selectedCategory !== 'all' || selectedCity !== 'الكل' || maxPrice < 50000000) && (
              <button
                onClick={onResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold transition"
              >
                إعادة تعيين الفلاتر
              </button>
            )}
          </div>

          {/* Form grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Keyword Search */}
            <div className="md:col-span-2 relative">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                كلمة البحث (العنوان، الحي، الكمبوند)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="مثال: فيلا بالتجمع الخامس، شقة بالشيخ زايد..."
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                نوع العقار
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none appearance-none cursor-pointer transition"
                >
                  <option value="all">جميع الأنواع</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                    if (key === 'all') return null;
                    return (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                المدينة / المنطقة
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full pl-4 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none appearance-none cursor-pointer transition"
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick city and beach pills */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-bold shrink-0">شواطئ بلطيم والمناطق الأكثر طلباً:</span>
            {[
              'مصيف بلطيم',
              'شاطئ النرجس',
              'شاطئ الفنار',
              'شاطئ الزهراء',
              'شاطئ السلام',
              'شاطئ الأمل',
              'شاطئ الفيروز',
              'التجمع الخامس',
              'الشيخ زايد',
              'الساحل الشمالي'
            ].map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setSearchQuery(area)}
                className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 rounded-lg text-slate-700 font-bold transition text-[11px]"
              >
                {area.includes('شاطئ') ? `🏖️ ${area}` : area}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
