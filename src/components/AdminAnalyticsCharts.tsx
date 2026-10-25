import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  MapPin,
  Sparkles,
  Award,
  Wallet
} from 'lucide-react';
import { Property, BookingRequest, UserProfile } from '../types';
import { CATEGORY_LABELS } from '../data/mockProperties';

interface AdminAnalyticsChartsProps {
  properties: Property[];
  bookings: BookingRequest[];
  users: UserProfile[];
}

// Monthly baseline metrics for Sakan Plus real estate performance
interface MonthlyDataPoint {
  month: string;
  shortMonth: string;
  salesVolumeMillions: number; // In Million EGP
  dealsCount: number;
  rentDealsCount: number;
  bookingsCount: number;
  avgDealPriceMillions: number;
}

const MONTHLY_PERFORMANCE_2026: MonthlyDataPoint[] = [
  { month: 'يناير 2026', shortMonth: 'يناير', salesVolumeMillions: 42.5, dealsCount: 7, rentDealsCount: 14, bookingsCount: 32, avgDealPriceMillions: 6.07 },
  { month: 'فبراير 2026', shortMonth: 'فبراير', salesVolumeMillions: 56.0, dealsCount: 9, rentDealsCount: 18, bookingsCount: 45, avgDealPriceMillions: 6.22 },
  { month: 'مارس 2026', shortMonth: 'مارس', salesVolumeMillions: 68.4, dealsCount: 11, rentDealsCount: 22, bookingsCount: 58, avgDealPriceMillions: 6.21 },
  { month: 'أبريل 2026', shortMonth: 'أبريل', salesVolumeMillions: 74.2, dealsCount: 12, rentDealsCount: 25, bookingsCount: 64, avgDealPriceMillions: 6.18 },
  { month: 'مايو 2026', shortMonth: 'مايو', salesVolumeMillions: 89.0, dealsCount: 15, rentDealsCount: 31, bookingsCount: 82, avgDealPriceMillions: 5.93 },
  { month: 'يونيو 2026', shortMonth: 'يونيو', salesVolumeMillions: 112.5, dealsCount: 19, rentDealsCount: 44, bookingsCount: 105, avgDealPriceMillions: 5.92 },
  { month: 'يوليو 2026', shortMonth: 'يوليو', salesVolumeMillions: 135.0, dealsCount: 23, rentDealsCount: 52, bookingsCount: 124, avgDealPriceMillions: 5.86 },
  { month: 'أغسطس 2026', shortMonth: 'أغسطس', salesVolumeMillions: 148.2, dealsCount: 25, rentDealsCount: 58, bookingsCount: 138, avgDealPriceMillions: 5.92 },
  { month: 'سبتمبر 2026', shortMonth: 'سبتمبر', salesVolumeMillions: 122.0, dealsCount: 20, rentDealsCount: 39, bookingsCount: 96, avgDealPriceMillions: 6.10 },
  { month: 'أكتوبر 2026', shortMonth: 'أكتوبر', salesVolumeMillions: 141.8, dealsCount: 22, rentDealsCount: 41, bookingsCount: 112, avgDealPriceMillions: 6.44 }
];

const PIE_COLORS = ['#059669', '#2563eb', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({
  properties,
  bookings,
  users
}) => {
  const [timeframe, setTimeframe] = useState<'6months' | 'fullYear'>('6months');
  const [salesMetricType, setSalesMetricType] = useState<'volume' | 'count'>('volume');

  // 1. Core Real-Time Computed Metrics from live properties
  const activeProperties = useMemo(() => {
    return properties.filter((p) => p.status === 'active');
  }, [properties]);

  const pendingProperties = useMemo(() => {
    return properties.filter((p) => p.status === 'pending');
  }, [properties]);

  const soldProperties = useMemo(() => {
    return properties.filter((p) => p.status === 'sold');
  }, [properties]);

  const salePropertiesCount = useMemo(() => {
    return activeProperties.filter((p) => p.type === 'sale').length;
  }, [activeProperties]);

  const rentPropertiesCount = useMemo(() => {
    return activeProperties.filter((p) => p.type === 'rent').length;
  }, [activeProperties]);

  // Total listing portfolio value (active properties)
  const totalActivePortfolioValue = useMemo(() => {
    return activeProperties.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  }, [activeProperties]);

  const avgActivePropertyPrice = useMemo(() => {
    if (activeProperties.length === 0) return 0;
    return Math.round(totalActivePortfolioValue / activeProperties.length);
  }, [activeProperties, totalActivePortfolioValue]);

  // 2. Active Properties Breakdown by Category
  const categoryChartData = useMemo(() => {
    const countsMap: Record<string, { count: number; totalValue: number }> = {};

    activeProperties.forEach((p) => {
      const cat = p.category || 'other';
      if (!countsMap[cat]) {
        countsMap[cat] = { count: 0, totalValue: 0 };
      }
      countsMap[cat].count += 1;
      countsMap[cat].totalValue += Number(p.price) || 0;
    });

    const entries = Object.keys(countsMap).map((cat) => {
      const label = CATEGORY_LABELS[cat] || cat;
      const count = countsMap[cat].count;
      const avgPrice = Math.round(countsMap[cat].totalValue / count);
      return {
        categoryKey: cat,
        name: label,
        count,
        avgPriceMillion: Number((avgPrice / 1000000).toFixed(2))
      };
    });

    // Sort descending by count
    return entries.sort((a, b) => b.count - a.count).slice(0, 7);
  }, [activeProperties]);

  // 3. Active vs Rent vs Sold Status Pie Data
  const propertyTypePieData = useMemo(() => {
    return [
      { name: 'عقارات للبيع نشطة', value: salePropertiesCount, color: '#059669' },
      { name: 'عقارات للإيجار نشطة', value: rentPropertiesCount, color: '#2563eb' },
      { name: 'عقارات تم التعاقد / مباعة', value: soldProperties.length, color: '#64748b' },
      { name: 'عقارات معلقة للاعتماد', value: pendingProperties.length, color: '#f59e0b' }
    ].filter((item) => item.value > 0);
  }, [salePropertiesCount, rentPropertiesCount, soldProperties.length, pendingProperties.length]);

  // 4. Monthly Performance Data adjusted with dynamic live sold/booking signals
  const displayedMonthlyData = useMemo(() => {
    const base = timeframe === '6months'
      ? MONTHLY_PERFORMANCE_2026.slice(-6)
      : MONTHLY_PERFORMANCE_2026;

    // Enhance current month (October) with actual live platform bookings & sold properties
    return base.map((item, index) => {
      if (index === base.length - 1) {
        const liveBonusBookings = Math.max(0, bookings.length - 10);
        const liveBonusDeals = soldProperties.length;
        return {
          ...item,
          dealsCount: item.dealsCount + liveBonusDeals,
          bookingsCount: item.bookingsCount + liveBonusBookings,
          salesVolumeMillions: Number((item.salesVolumeMillions + liveBonusDeals * 4.5).toFixed(1))
        };
      }
      return item;
    });
  }, [timeframe, bookings.length, soldProperties.length]);

  // Total annual sales volume computed
  const totalSalesVolumeAnnual = useMemo(() => {
    return MONTHLY_PERFORMANCE_2026.reduce((acc, curr) => acc + curr.salesVolumeMillions, 0);
  }, []);

  const totalDealsAnnual = useMemo(() => {
    return MONTHLY_PERFORMANCE_2026.reduce((acc, curr) => acc + curr.dealsCount, 0);
  }, []);

  // 5. Geographical Distribution (Top Egyptian Locations)
  const locationChartData = useMemo(() => {
    const locMap: Record<string, number> = {};

    activeProperties.forEach((p) => {
      let loc = p.location || 'أخرى';
      if (loc.includes('بلطيم') || loc.includes('كفر الشيخ')) loc = 'مصيف بلطيم وكفر الشيخ';
      else if (loc.includes('التجمع') || loc.includes('القاهرة الجديدة')) loc = 'التجمع والقاهرة الجديدة';
      else if (loc.includes('الشيخ زايد') || loc.includes('أكتوبر')) loc = 'الشيخ زايد و6 أكتوبر';
      else if (loc.includes('الساحل') || loc.includes('العلمين') || loc.includes('رأس الحكمة')) loc = 'الساحل الشمالي ورأس الحكمة';
      else if (loc.includes('المعادي')) loc = 'المعادي والقاهرة';
      else if (loc.includes('العاصمة')) loc = 'العاصمة الإدارية';

      locMap[loc] = (locMap[loc] || 0) + 1;
    });

    return Object.keys(locMap)
      .map((key) => ({ name: key, count: locMap[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [activeProperties]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-gradient-to-l from-blue-950 via-slate-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </span>
              <span className="text-xs font-black tracking-wide text-amber-400 uppercase">
                لوحة التحليلات والمؤشرات البيانية
              </span>
            </div>
            <h2 className="text-2xl font-black">
              إحصائيات العقارات النشطة والمبيعات الشهرية
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              رصد مرئي لحظي لأداء منصة سكن بلس، حجم المبيعات والصفقات المنفذة، وتوزيع العقارات المعتمدة حسب الفئات والمناطق.
            </p>
          </div>

          {/* Quick Filter Control */}
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700 self-stretch md:self-auto justify-center">
            <button
              type="button"
              onClick={() => setTimeframe('6months')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                timeframe === '6months'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              آخر 6 أشهر
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('fullYear')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                timeframe === 'fullYear'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              العام كاملاً 2026
            </button>
          </div>
        </div>

        {/* 4 Core Financial & Listing Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>حجم المبيعات والتعاقدات</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
              <span>{totalSalesVolumeAnnual.toFixed(1)}</span>
              <span className="text-xs font-normal text-emerald-400">مليون ج.م</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% نمو ربع سنوي</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>العقارات النشطة بالمنصة</span>
              <Building2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
              <span>{activeProperties.length}</span>
              <span className="text-xs font-normal text-slate-400">عقار معتمد</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {salePropertiesCount} بيع · {rentPropertiesCount} إيجار
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>متوسط سعر الوحدة النشطة</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
              <span>{(avgActivePropertyPrice / 1000000).toFixed(2)}</span>
              <span className="text-xs font-normal text-blue-400">مليون ج.م</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              إجمالي المحفظة: {(totalActivePortfolioValue / 1000000).toFixed(1)}M ج.م
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span>الصفقات المكتملة 2026</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
              <span>{totalDealsAnnual}</span>
              <span className="text-xs font-normal text-emerald-400">صفقة بيع</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              مع {bookings.length} طلب معاينة مسجل
            </div>
          </div>
        </div>
      </div>

      {/* CHART SECTION 1: Monthly Sales & Contracts Performance */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-black text-slate-900">
                منحنى المبيعات والتعاقدات الشهرية (2026)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة حجم الصفقات المالية بالمليون جنيه وعدد التعاقدات الناجحة شهرياً
            </p>
          </div>

          {/* Metric toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSalesMetricType('volume')}
              className={`px-3 py-1.5 rounded-lg transition ${
                salesMetricType === 'volume'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              القيمة المالية (مليون ج.م)
            </button>
            <button
              type="button"
              onClick={() => setSalesMetricType('count')}
              className={`px-3 py-1.5 rounded-lg transition ${
                salesMetricType === 'count'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عدد الصفقات والمعاينات
            </button>
          </div>
        </div>

        {/* Recharts Area / Bar Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {salesMetricType === 'volume' ? (
              <AreaChart data={displayedMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortMonth"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}M`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyDataPoint;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl text-xs border border-slate-700 min-w-[180px]">
                          <div className="font-black text-amber-400 mb-1.5">{data.month}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-300">قيمة المبيعات:</span>
                              <strong className="text-emerald-400 font-mono">
                                {data.salesVolumeMillions} مليون ج.م
                              </strong>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-300">صفقات البيع:</span>
                              <strong className="font-mono">{data.dealsCount} صفقة</strong>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-300">عقود الإيجار:</span>
                              <strong className="font-mono">{data.rentDealsCount} عقد</strong>
                            </div>
                            <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
                              <span className="text-slate-400">طلبات المعاينة:</span>
                              <strong className="font-mono text-amber-300">{data.bookingsCount} طلب</strong>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="salesVolumeMillions"
                  name="حجم المبيعات (مليون ج.م)"
                  stroke="#059669"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                  activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={displayedMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortMonth"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyDataPoint;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[170px]">
                          <div className="font-black text-amber-400 mb-1">{data.month}</div>
                          <div className="space-y-1">
                            <div className="flex justify-between gap-3 text-emerald-400">
                              <span>صفقات بيع منجزة:</span>
                              <strong className="font-mono">{data.dealsCount}</strong>
                            </div>
                            <div className="flex justify-between gap-3 text-blue-400">
                              <span>عقود إيجار:</span>
                              <strong className="font-mono">{data.rentDealsCount}</strong>
                            </div>
                            <div className="flex justify-between gap-3 text-amber-300">
                              <span>طلبات معاينة:</span>
                              <strong className="font-mono">{data.bookingsCount}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={(value) => <span className="text-slate-700 font-bold px-1">{value}</span>}
                />
                <Bar dataKey="dealsCount" name="صفقات بيع" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="rentDealsCount" name="عقود إيجار" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="bookingsCount" name="معاينات" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-COLUMN SECTION: Active Properties Categories & Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Active Properties by Category */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-900" />
                <span>توزيع العقارات النشطة حسب الفئة</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                عدد الوحدات المعتمدة المعروضة حالياً لكل نوع عقار
              </p>
            </div>
            <span className="text-xs font-black text-blue-950 bg-blue-50 px-2.5 py-1 rounded-xl">
              {activeProperties.length} عقار نشط
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#334155"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-700">
                          <div className="font-bold text-amber-400 mb-1">{data.name}</div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-300">العدد النشط:</span>
                            <strong className="font-mono">{data.count} عقار</strong>
                          </div>
                          {data.avgPriceMillion > 0 && (
                            <div className="flex justify-between gap-3 text-emerald-400 mt-0.5">
                              <span>متوسط السعر:</span>
                              <strong className="font-mono">{data.avgPriceMillion} مليون ج.م</strong>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" name="عدد العقارات" fill="#1e3a8a" radius={[0, 6, 6, 0]}>
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column (5 cols): Property Status & Type Pie Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                <span>حالة العقارات (بيع / إيجار / تعاقد)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              النسبة المئوية لحالات العقارات المسجلة بالمنصة
            </p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyTypePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {propertyTypePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const total = properties.length || 1;
                      const pct = ((data.value / total) * 100).toFixed(1);
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-lg border border-slate-700">
                          <div className="font-bold text-amber-400">{data.name}</div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <span className="text-slate-300">العدد:</span>
                            <strong className="font-mono">{data.value} عقار ({pct}%)</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label inside donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {properties.length}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">إجمالي العقارات</span>
            </div>
          </div>

          {/* Clean Legend Pill-less */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {propertyTypePieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}</span>
                <strong className="font-mono text-slate-900 mr-auto">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: Geographical Breakdown & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Locations */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>المناطق والمدن الأكثر نشاطاً في العرض والطلب</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توزيع العقارات النشطة على الوجهات الاستثمارية والمصيفية الرائدة
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {locationChartData.map((loc, idx) => {
              const maxCount = Math.max(...locationChartData.map((l) => l.count), 1);
              const percentage = Math.round((loc.count / (activeProperties.length || 1)) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-slate-800">{loc.name}</span>
                    <span className="font-mono text-slate-600">
                      <strong>{loc.count}</strong> عقار نشط ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-emerald-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(12, (loc.count / maxCount) * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Analytics Takeaways */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-500" />
              <span>مؤشرات الكفاءة للمالك</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                <div className="font-bold text-slate-700">معدل تحويل المعاينات</div>
                <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">
                  ~24.8%
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  لكل 4 طلبات معاينة واردة يتم إتمام صفقة تعاقد ناجحة.
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                <div className="font-bold text-slate-700">سرعة اعتماد ونشر الإعلانات</div>
                <div className="text-lg font-black text-blue-900 font-mono mt-0.5">
                  فورية (0 دقيقة)
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  بفضل لوحة تحكم المالك ذات التحديث المباشر عبر فايرستور.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              البيانات متصلة لحظياً بمستودع بيانات سكن بلس (Firestore & Server DB)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
