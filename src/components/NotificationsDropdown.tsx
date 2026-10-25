import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Settings, Sparkles, Building2, MapPin, ExternalLink, SlidersHorizontal } from 'lucide-react';
import { InAppNotification, Property } from '../types';
import { formatRelativeTimeArabic } from '../utils/notificationUtils';

interface NotificationsDropdownProps {
  notifications: InAppNotification[];
  onSelectPropertyById: (propertyId: string) => void;
  onMarkAllAsRead: () => void;
  onMarkAsRead: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  onOpenInterestsModal: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  notifications,
  onSelectPropertyById,
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
  onOpenInterestsModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: InAppNotification) => {
    onMarkAsRead(notif.id);
    if (notif.propertyId) {
      onSelectPropertyById(notif.propertyId);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-blue-950 transition active:scale-95 flex items-center justify-center border border-slate-200/80"
        title="التنبيهات والإشعارات"
        aria-label="قائمة التنبيهات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse font-mono">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-300">التنبيهات والإشعارات</h4>
                <p className="text-[10px] text-slate-300">عقارات جديدة تتطابق مع اهتماماتك</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition"
                  title="تحديد الكل كمقروء"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">قراءة الكل</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenInterestsModal();
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition"
                title="تعديل اهتماماتي العقارية"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-800">لا توجد تنبيهات حالياً</h5>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    سنرسل لك تنبيهاً فورياً داخل التطبيق بمجرد نشر عقار جديد يطابق مدنك المفضلة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenInterestsModal();
                  }}
                  className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>تحديد المدن المفضلة</span>
                </button>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 rounded-2xl transition cursor-pointer flex items-start gap-3 relative group ${
                    notif.read ? 'hover:bg-slate-50 opacity-90' : 'bg-amber-50/60 hover:bg-amber-100/60'
                  }`}
                >
                  {/* Unread indicator */}
                  {!notif.read && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-4 left-3 shadow-xs"></span>
                  )}

                  {/* Property Thumbnail */}
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200 shadow-xs relative">
                    {notif.propertyImage ? (
                      <img
                        src={notif.propertyImage}
                        alt="عقار"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-950 text-amber-400">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}
                    {notif.propertyType && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-black text-center py-0.5">
                        {notif.propertyType === 'rent' ? 'إيجار' : 'بيع'}
                      </span>
                    )}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black bg-amber-500/15 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-md">
                        {notif.matchReason || 'مطابق لاهتماماتك'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatRelativeTimeArabic(notif.createdAt)}
                      </span>
                    </div>

                    <h5 className="text-xs font-black text-slate-900 mt-1 line-clamp-1 group-hover:text-blue-950 transition">
                      {notif.propertyTitle || notif.title}
                    </h5>

                    <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                      {notif.message}
                    </p>

                    {notif.propertyPrice && (
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="font-black text-amber-700 font-mono">
                          {Number(notif.propertyPrice).toLocaleString()} ج.م
                        </span>
                        <span className="text-xs text-blue-900 font-bold flex items-center gap-0.5 group-hover:underline">
                          <span>عرض التفاصيل</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(notif.id);
                    }}
                    className="p-1 text-slate-300 hover:text-rose-600 hover:bg-white rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="حذف هذا الإشعار"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenInterestsModal();
              }}
              className="text-xs font-bold text-slate-700 hover:text-blue-950 flex items-center gap-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5 text-amber-600" />
              <span>تعديل المدن والاهتمامات المفضلة</span>
            </button>

            <span className="text-[10px] text-slate-400 font-bold">
              سكن بلس الذكي
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
