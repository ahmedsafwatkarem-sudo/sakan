import { AdminNotification, InAppNotification, Property, UserPreferences, UserProfile } from '../types';
import {
  apiAddAdminNotification,
  apiFetchAdminNotifications,
  apiMarkAdminNotificationRead,
  apiMarkAllAdminNotificationsRead,
  apiDeleteAdminNotification
} from './apiSync';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  preferredCities: ['مصيف بلطيم', 'كفر الشيخ', 'القاهرة الجديدة'],
  preferredType: 'all',
  notifyOnMatch: true
};

export const POPULAR_INTEREST_CITIES = [
  'مصيف بلطيم',
  'مصيف بلطيم - شاطئ الفنار',
  'مصيف بلطيم - شاطئ النرجس',
  'مصيف بلطيم - شاطئ الزهراء',
  'مصيف بلطيم - شاطئ السلام',
  'مصيف بلطيم - شاطئ الأمل',
  'مصيف بلطيم - شاطئ الفيروز',
  'مارينا دلتا (كفر الشيخ)',
  'قرية الصيادلة (كفر الشيخ)',
  'قرية مارينا بلو بيتش (كفر الشيخ)',
  'كفر الشيخ',
  'التجمع الخامس والقاهرة الجديدة',
  'الشيخ زايد',
  '6 أكتوبر',
  'الساحل الشمالي والعلمين',
  'رأس الحكمة',
  'رأس البر',
  'الإسكندرية',
  'المنصورة'
];

/**
 * Get user preferences from local storage or profile
 */
export const getUserPreferences = (user: UserProfile | null): UserPreferences => {
  if (!user) return DEFAULT_USER_PREFERENCES;
  try {
    const saved = localStorage.getItem(`sakan_prefs_${user.uid}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }
  return user.preferences || DEFAULT_USER_PREFERENCES;
};

/**
 * Save user preferences
 */
export const saveUserPreferences = (userId: string, prefs: UserPreferences): void => {
  try {
    localStorage.setItem(`sakan_prefs_${userId}`, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save user preferences', err);
  }
};

/**
 * Check if a property matches a user's interests/preferences
 */
export const checkPropertyMatchesPreferences = (
  property: Property,
  prefs: UserPreferences
): { matches: boolean; matchedCity?: string } => {
  if (prefs.notifyOnMatch === false) {
    return { matches: false };
  }

  // Check property type if specific
  if (prefs.preferredType && prefs.preferredType !== 'all') {
    if (property.type !== prefs.preferredType) {
      return { matches: false };
    }
  }

  if (!prefs.preferredCities || prefs.preferredCities.length === 0) {
    return { matches: false };
  }

  const searchableLocation = `${property.location} ${property.addressDetails || ''} ${property.title}`.toLowerCase();

  for (const city of prefs.preferredCities) {
    const cleanCity = city.trim().toLowerCase();
    
    // Exact or substring match
    if (searchableLocation.includes(cleanCity)) {
      return { matches: true, matchedCity: city };
    }

    // Special handling for Baltim beaches
    if (cleanCity.includes('بلطيم') && searchableLocation.includes('بلطيم')) {
      return { matches: true, matchedCity: city };
    }

    // Special handling for Marina Delta, Sayadla, and Marina Blue Beach
    if (cleanCity.includes('مارينا دلتا') && searchableLocation.includes('مارينا دلتا')) {
      return { matches: true, matchedCity: city };
    }
    if (cleanCity.includes('صيادلة') && (searchableLocation.includes('صيادلة') || searchableLocation.includes('صيدلة'))) {
      return { matches: true, matchedCity: city };
    }
    if ((cleanCity.includes('بلو بيتش') || cleanCity.includes('مارينا بلو')) && (searchableLocation.includes('بلو بيتش') || searchableLocation.includes('blue beach'))) {
      return { matches: true, matchedCity: city };
    }

    // Special handling for New Cairo / Tagamoa
    if (
      (cleanCity.includes('القاهرة الجديدة') || cleanCity.includes('التجمع')) &&
      (searchableLocation.includes('قاهرة جديدة') || searchableLocation.includes('تجمع') || searchableLocation.includes('new cairo'))
    ) {
      return { matches: true, matchedCity: city };
    }

    // Special handling for Sheikh Zayed
    if (cleanCity.includes('زايد') && searchableLocation.includes('زايد')) {
      return { matches: true, matchedCity: city };
    }
  }

  return { matches: false };
};

/**
 * Get user in-app notifications
 */
export const getUserNotifications = (
  userId: string,
  properties: Property[] = []
): InAppNotification[] => {
  try {
    const saved = localStorage.getItem(`sakan_notifs_${userId}`);
    if (saved) {
      const parsed: InAppNotification[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading notifications', err);
  }

  // If user has no notifications yet, initialize with matching active properties
  const prefs = getUserPreferences({ uid: userId } as UserProfile);
  const initialNotifications: InAppNotification[] = [];

  const matched = properties.filter((p) => {
    const { matches } = checkPropertyMatchesPreferences(p, prefs);
    return matches;
  });

  const sampleProps = matched.length > 0 ? matched.slice(0, 3) : properties.slice(0, 2);

  sampleProps.forEach((prop, idx) => {
    initialNotifications.push({
      id: `notif-init-${idx}-${prop.id}`,
      userId,
      title: 'عقار جديد يطابق اهتماماتك!',
      message: `تم إضافة عقار مميز "${prop.title}" في ${prop.location} بسعر ${Number(prop.price).toLocaleString()} ج.م.`,
      propertyId: prop.id,
      propertyTitle: prop.title,
      propertyCity: prop.location,
      propertyPrice: prop.price,
      propertyImage: prop.images?.[0],
      propertyType: prop.type,
      createdAt: Date.now() - (idx + 1) * 3600000 * 2,
      read: idx > 0, // Keep first one unread
      matchReason: `مدينة مطابقة لاهتماماتك (${prop.location.split('،')[0] || prop.location})`
    });
  });

  saveUserNotifications(userId, initialNotifications);
  return initialNotifications;
};

/**
 * Save user in-app notifications
 */
export const saveUserNotifications = (userId: string, notifications: InAppNotification[]): void => {
  try {
    localStorage.setItem(`sakan_notifs_${userId}`, JSON.stringify(notifications));
  } catch (err) {
    console.error('Error saving notifications', err);
  }
};

/**
 * Construct a new notification from a newly created property
 */
export const createNotificationFromProperty = (
  property: Property,
  userId: string,
  matchedCity: string
): InAppNotification => {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: 'عقار جديد يطابق اهتماماتك!',
    message: `تم نشر "${property.title}" في ${property.location} بقيمة ${Number(property.price).toLocaleString()} ج.م.`,
    propertyId: property.id,
    propertyTitle: property.title,
    propertyCity: property.location,
    propertyPrice: property.price,
    propertyImage: property.images?.[0],
    propertyType: property.type,
    createdAt: Date.now(),
    read: false,
    matchReason: `مدينة مطابقة: ${matchedCity}`
  };
};

/**
 * Format relative time in Arabic
 */
export const formatRelativeTimeArabic = (timestamp: number): string => {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `منذ ${diffDay} يوم`;
  return new Date(timestamp).toLocaleDateString('ar-EG');
};

/**
 * MASTER OWNER ADMINISTRATIVE NOTIFICATIONS STORE
 */
const ADMIN_NOTIFS_STORAGE_KEY = 'sakan_admin_notifications';

export const INITIAL_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'admin-init-welcome',
    type: 'system',
    title: 'مرحباً بك في مركز الإشعارات والتحكم للمالك الأساسي',
    message: 'هنا يتم استقبال كافة إشعارات المنصة لحظياً: تسجيل مستخدمين جدد، طلبات تراخيص النشر، العقارات المعلقة بانتظار الاعتماد، والحجوزات.',
    createdAt: Date.now() - 3600000 * 2,
    read: true,
    linkType: 'users'
  },
  {
    id: 'admin-init-sample-req',
    type: 'publish_request',
    title: 'طلب تصريح نشر عقارات جديد',
    message: 'المستخدم أحمد المنشاوي (شركة المنار) يطلب ترخيص النشر المباشر للعقارات.',
    createdAt: Date.now() - 3600000,
    read: false,
    linkType: 'pending',
    userName: 'أحمد المنشاوي',
    userPhone: '01223344556',
    userRole: 'owner'
  }
];

/**
 * Retrieve admin notifications from localStorage or fallback
 */
export const getAdminNotifications = (): AdminNotification[] => {
  try {
    const raw = localStorage.getItem(ADMIN_NOTIFS_STORAGE_KEY);
    if (raw) {
      const parsed: AdminNotification[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading admin notifications:', err);
  }

  // Fallback to initial notifications
  saveAdminNotifications(INITIAL_ADMIN_NOTIFICATIONS);
  return INITIAL_ADMIN_NOTIFICATIONS;
};

/**
 * Persist admin notifications to localStorage
 */
export const saveAdminNotifications = (notifications: AdminNotification[]): void => {
  try {
    localStorage.setItem(ADMIN_NOTIFS_STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error('Error saving admin notifications:', err);
  }
};

/**
 * Add a new administrative notification for the master owner
 */
export const addAdminNotification = (notif: AdminNotification): void => {
  try {
    const current = getAdminNotifications();
    // Prevent exact duplicates within a short period
    const exists = current.some((n) => n.id === notif.id || (n.type === notif.type && n.message === notif.message && Date.now() - n.createdAt < 5000));
    if (exists) return;

    const updated = [notif, ...current.slice(0, 99)]; // Keep up to 100 recent notifications
    saveAdminNotifications(updated);

    // Sync to shared server so all devices/IPs receive it
    apiAddAdminNotification(notif).catch(() => {});

    // Broadcast instant event across window & tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sakan_admin_notification', { detail: notif }));
    }
  } catch (err) {
    console.error('Failed to add admin notification:', err);
  }
};

/**
 * Mark a single admin notification as read
 */
export const markAdminNotificationRead = (id: string): AdminNotification[] => {
  const current = getAdminNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveAdminNotifications(updated);
  apiMarkAdminNotificationRead(id).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sakan_admin_notification_updated', { detail: updated }));
  }
  return updated;
};

/**
 * Mark all admin notifications as read
 */
export const markAllAdminNotificationsRead = (): AdminNotification[] => {
  const current = getAdminNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveAdminNotifications(updated);
  apiMarkAllAdminNotificationsRead().catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sakan_admin_notification_updated', { detail: updated }));
  }
  return updated;
};

/**
 * Delete an admin notification
 */
export const deleteAdminNotification = (id: string): AdminNotification[] => {
  const current = getAdminNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveAdminNotifications(updated);
  apiDeleteAdminNotification(id).catch(() => {});
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sakan_admin_notification_updated', { detail: updated }));
  }
  return updated;
};
