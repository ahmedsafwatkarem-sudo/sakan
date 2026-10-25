import React, { useState } from 'react';
import { Phone, PlusCircle, ShieldCheck, User as UserIcon, LogOut, Menu, X, MessageSquare, Crown, Bell } from 'lucide-react';
import { InAppNotification, UserProfile } from '../types';
import { NotificationsDropdown } from './NotificationsDropdown';

interface NavbarProps {
  currentUser: UserProfile | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenAddProperty: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  activeFilterType: 'all' | 'sale' | 'rent';
  onSelectFilterType: (type: 'all' | 'sale' | 'rent') => void;
  notifications?: InAppNotification[];
  onSelectPropertyById?: (propertyId: string) => void;
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
  onOpenInterestsModal?: () => void;
  adminAlertsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onOpenAddProperty,
  onOpenAdmin,
  onOpenProfile,
  onLogout,
  activeFilterType,
  onSelectFilterType,
  notifications = [],
  onSelectPropertyById = () => {},
  onMarkAllAsRead = () => {},
  onMarkAsRead = () => {},
  onDeleteNotification = () => {},
  onOpenInterestsModal = () => {},
  adminAlertsCount = 0
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-amber-500/20 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-300">مسؤول</span>;
      case 'owner':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-200">مالك / بائع</span>;
      case 'renter':
        return <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">مؤجر</span>;
      default:
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">عميل</span>;
    }
  };

  return (
    <header className="fixed top-0 w-full z-50 glass-nav border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-md shadow-amber-500/20 hover:scale-105 transition duration-200 border border-amber-400/40 bg-slate-900 group shrink-0"
                title="سكن بلس - المنصة العقارية"
              >
                <img 
                  src="/sakan-logo.svg" 
                  alt="شعار سكن بلس" 
                  className="w-full h-full object-contain p-0.5 group-hover:scale-110 transition-transform duration-300" 
                />
              </a>
              <div className="text-right">
                <a href="#" className="flex items-center gap-2 group">
                  <span className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-950 transition">
                    سكن <span className="text-amber-600">بلس</span>
                  </span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">عقارات مصر</span>
                </a>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <a
                    href="https://wa.me/201007775402?text=مرحباً%20سكن%20بلس%20أريد%20الاستفسار%20عن%20العقارات"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-700 flex items-center gap-1 transition"
                  >
                    <span className="font-mono tracking-wider font-bold text-slate-800">01007775402</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-emerald-600 font-bold text-[11px]">واتساب</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Center Navigation Shortcuts */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-full border border-slate-200">
            <button
              onClick={() => onSelectFilterType('all')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
                activeFilterType === 'all'
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              جميع العقارات
            </button>
            <button
              onClick={() => onSelectFilterType('sale')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
                activeFilterType === 'sale'
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              عقارات للبيع
            </button>
            <button
              onClick={() => onSelectFilterType('rent')}
              className={`px-5 py-1.5 rounded-full text-xs font-bold transition ${
                activeFilterType === 'rent'
                  ? 'bg-blue-950 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              عقارات للإيجار
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* Admin button */}
                {currentUser.role === 'admin' && (
                  <button
                    onClick={onOpenAdmin}
                    className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm shadow-amber-500/30 transition hover:scale-[1.02]"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>لوحة التحكم</span>
                    {adminAlertsCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-black bg-rose-600 text-white rounded-full animate-pulse shadow-sm">
                        {adminAlertsCount > 99 ? '+99' : adminAlertsCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Add property button */}
                {(currentUser.role === 'owner' || currentUser.role === 'renter' || currentUser.role === 'admin') && (
                  <button
                    onClick={onOpenAddProperty}
                    className="flex items-center gap-2 bg-blue-950 hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition hover:scale-[1.02]"
                  >
                    <PlusCircle className="w-4 h-4 text-amber-400" />
                    إضافة عقار
                  </button>
                )}

                {/* Notifications Dropdown for registered users */}
                <NotificationsDropdown
                  notifications={notifications}
                  onSelectPropertyById={onSelectPropertyById}
                  onMarkAllAsRead={onMarkAllAsRead}
                  onMarkAsRead={onMarkAsRead}
                  onDeleteNotification={onDeleteNotification}
                  onOpenInterestsModal={onOpenInterestsModal}
                />

                {/* Profile button */}
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <UserIcon className="w-4 h-4 text-blue-900" />
                  <span className="max-w-[120px] truncate">{currentUser.name || currentUser.phone}</span>
                  {getRoleBadge(currentUser.role)}
                </button>

                {/* Logout button */}
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAddProperty}
                  className="flex items-center gap-1.5 text-slate-700 hover:text-blue-950 text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-100 transition"
                >
                  <PlusCircle className="w-4 h-4 text-amber-600" />
                  أضف عقارك
                </button>

                <button
                  onClick={() => onOpenAuth('login')}
                  className="bg-blue-950 hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md shadow-blue-950/20 transition hover:scale-[1.02]"
                >
                  دخول / تسجيل
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button & Notifications */}
          <div className="flex lg:hidden items-center gap-1.5">
            {currentUser && (
              <NotificationsDropdown
                notifications={notifications}
                onSelectPropertyById={onSelectPropertyById}
                onMarkAllAsRead={onMarkAllAsRead}
                onMarkAsRead={onMarkAsRead}
                onDeleteNotification={onDeleteNotification}
                onOpenInterestsModal={onOpenInterestsModal}
              />
            )}
            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={onOpenAdmin}
                className="relative p-2 bg-amber-500 text-white rounded-lg text-xs font-bold"
                title="لوحة تحكم المسؤول"
              >
                <ShieldCheck className="w-4 h-4" />
                {adminAlertsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-black bg-rose-600 text-white rounded-full animate-pulse shadow">
                    {adminAlertsCount > 99 ? '99+' : adminAlertsCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
              aria-label="القائمة"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
            <button
              onClick={() => { onSelectFilterType('all'); setMobileMenuOpen(false); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg text-center ${
                activeFilterType === 'all' ? 'bg-blue-950 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => { onSelectFilterType('sale'); setMobileMenuOpen(false); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg text-center ${
                activeFilterType === 'sale' ? 'bg-blue-950 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              للبيع
            </button>
            <button
              onClick={() => { onSelectFilterType('rent'); setMobileMenuOpen(false); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg text-center ${
                activeFilterType === 'rent' ? 'bg-blue-950 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              للإيجار
            </button>
          </div>

          {currentUser ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <div className="font-bold text-sm text-slate-900">{currentUser.name || currentUser.phone}</div>
                  <div className="text-xs text-slate-500 font-mono">{currentUser.phone}</div>
                </div>
                {getRoleBadge(currentUser.role)}
              </div>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => { onOpenAdmin(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xs transition"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>لوحة تحكم المسؤول</span>
                  </div>
                  {adminAlertsCount > 0 && (
                    <span className="bg-rose-600 text-white text-xs px-2.5 py-0.5 rounded-full font-black animate-pulse">
                      {adminAlertsCount} جديد
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => { onOpenAddProperty(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 bg-blue-950 text-white py-2.5 rounded-xl font-bold text-sm shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                إضافة عقار جديد
              </button>

              <button
                onClick={() => { onOpenProfile(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-800 py-2.5 rounded-xl font-bold text-sm"
              >
                <UserIcon className="w-4 h-4" />
                الملف الشخصي وعقاراتي
              </button>

              <button
                onClick={() => { onOpenInterestsModal(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-between p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-xs transition border border-amber-200/80"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>اهتماماتي العقارية وإشعارات المدن</span>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                  تعديل
                </span>
              </button>

              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 text-rose-600 bg-rose-50 py-2.5 rounded-xl font-bold text-sm"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                className="w-full bg-blue-950 text-white py-3 rounded-xl font-bold text-sm shadow-md"
              >
                دخول / تسجيل حساب جديد
              </button>
              <button
                onClick={() => { onOpenAddProperty(); setMobileMenuOpen(false); }}
                className="w-full border border-blue-950 text-blue-950 py-2.5 rounded-xl font-bold text-sm"
              >
                إضافة عقار
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>الخط الساخن:</span>
            <a
              href="https://wa.me/201007775402"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-700 font-mono flex items-center gap-1"
            >
              01007775402
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
