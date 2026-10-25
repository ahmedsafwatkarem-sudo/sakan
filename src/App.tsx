/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  Search, 
  SlidersHorizontal, 
  MessageCircle, 
  Phone, 
  PlusCircle, 
  Sparkles, 
  ArrowUpDown, 
  Home as HomeIcon,
  CheckCircle,
  HelpCircle,
  X,
  Crown
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';

import { 
  auth, 
  db,
  getUserProfile, 
  fetchRemoteProperties, 
  addRemoteProperty, 
  updateRemoteProperty, 
  deleteRemoteProperty,
  fetchAllRegisteredUsers,
  updateUserPublishingPermission,
  subscribeToRegisteredUsers,
  subscribeToRemoteProperties,
  createNewUserAccountByAdmin,
  deleteUserAccountByAdmin,
  MASTER_OWNER_PHONE,
  isMasterAdmin,
  INITIAL_REGISTERED_USERS,
  getRegisteredAccounts,
  getDeletedUserPhones,
  setLastAdminEditTime
} from './firebase';
import { connectSyncStream, addSyncEventListener, apiAddBooking } from './utils/apiSync';
import { Property, PropertyType, UserProfile, BookingRequest, PropertyReview, UserRole } from './types';
import { INITIAL_PROPERTIES, CATEGORY_LABELS, CITIES } from './data/mockProperties';

import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PropertyCard } from './components/PropertyCard';
import { PropertyModal } from './components/PropertyModal';
import { AddPropertyModal } from './components/AddPropertyModal';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { UserProfileModal } from './components/UserProfileModal';
import { Footer } from './components/Footer';
import { Toast, ToastMessage } from './components/Toast';
import { RequireAuthModal, AuthRequiredAction } from './components/RequireAuthModal';
import { UserInterestsModal } from './components/UserInterestsModal';
import { InAppNotification, UserPreferences, AdminNotification } from './types';
import {
  getUserPreferences,
  saveUserPreferences,
  getUserNotifications,
  saveUserNotifications,
  checkPropertyMatchesPreferences,
  createNotificationFromProperty,
  getAdminNotifications,
  addAdminNotification,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification
} from './utils/notificationUtils';

export default function App() {
  // Current logged in user
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('sakan_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Registered users & active clients list for owner dashboard
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Properties list
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('sakan_local_properties');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingIds = new Set(parsed.map((p: Property) => p.id));
          const missing = INITIAL_PROPERTIES.filter((p) => !existingIds.has(p.id));
          const updatedParsed = parsed.map((p: Property) => {
            const init = INITIAL_PROPERTIES.find((item) => item.id === p.id);
            if (init && (p.id === 'prop-baltim-1' || p.id === 'prop-baltim-2')) {
              return { ...p, location: init.location, addressDetails: init.addressDetails, video: p.video || init.video };
            }
            return p;
          });
          return [...missing, ...updatedParsed];
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_PROPERTIES;
  });

  // Booking inspection requests
  const [bookings, setBookings] = useState<BookingRequest[]>(() => {
    const saved = localStorage.getItem('sakan_bookings');
    return saved ? JSON.parse(saved) : [];
  });

  // Modals state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInterestsOpen, setIsInterestsOpen] = useState(false);

  // Registered User Preferences & In-App Notifications
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() => {
    return getUserPreferences(currentUser);
  });
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => {
    if (!currentUser) return [];
    return getUserNotifications(currentUser.uid, INITIAL_PROPERTIES);
  });

  // Keep notifications and preferences in sync with currentUser
  useEffect(() => {
    if (currentUser) {
      const prefs = getUserPreferences(currentUser);
      setUserPreferences(prefs);
      const notifs = getUserNotifications(currentUser.uid, properties);
      setNotifications(notifs);
    } else {
      setNotifications([]);
    }
  }, [currentUser?.uid]);

  // Master Owner Administrative Notifications
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>(() => {
    return getAdminNotifications();
  });

  const adminAlertsCount = useMemo(() => {
    return adminNotifications.filter((n) => !n.read).length;
  }, [adminNotifications]);

  // Synchronize admin notifications across events and storage
  useEffect(() => {
    const handleAdminNotif = (e: any) => {
      const refreshed = getAdminNotifications();
      setAdminNotifications(refreshed);
      if (currentUser?.role === 'admin' && e.detail?.title) {
        showToast(`🔔 ${e.detail.title}: ${e.detail.message}`, 'info');
      }
    };

    const handleNotifUpdate = () => {
      setAdminNotifications(getAdminNotifications());
    };

    const handleUserRegistered = (e: any) => {
      if (e.detail) {
        setUsers((prev) => {
          const list = prev.filter((u) => u.uid !== e.detail.uid && u.phone !== e.detail.phone);
          return [e.detail, ...list];
        });
        if (currentUser?.role === 'admin') {
          showToast(`👤 تم تسجيل حساب جديد: ${e.detail.name || e.detail.phone}`, 'info');
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sakan_admin_notifications') {
        setAdminNotifications(getAdminNotifications());
      }
    };

    window.addEventListener('sakan_admin_notification', handleAdminNotif);
    window.addEventListener('sakan_admin_notification_updated', handleNotifUpdate);
    window.addEventListener('sakan_user_registered', handleUserRegistered);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('sakan_admin_notification', handleAdminNotif);
      window.removeEventListener('sakan_admin_notification_updated', handleNotifUpdate);
      window.removeEventListener('sakan_user_registered', handleUserRegistered);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser?.role]);

  const handleMarkAllAsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveUserNotifications(currentUser.uid, updated);
      return updated;
    });
    showToast('تم تحديد كافة الإشعارات كمقروءة', 'info');
  };

  const handleMarkAsRead = (id: string) => {
    if (!currentUser) return;
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveUserNotifications(currentUser.uid, updated);
      return updated;
    });
  };

  const handleDeleteNotification = (id: string) => {
    if (!currentUser) return;
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveUserNotifications(currentUser.uid, updated);
      return updated;
    });
    showToast('تم حذف الإشعار', 'info');
  };

  const handleSelectPropertyById = (propId: string) => {
    const prop = properties.find((p) => p.id === propId);
    if (prop) {
      setSelectedProperty(prop);
    } else {
      showToast('العقار المطلوب غير متوفر حالياً', 'info');
    }
  };

  const handleSaveUserPreferences = (newPrefs: UserPreferences) => {
    if (!currentUser) return;
    setUserPreferences(newPrefs);
    saveUserPreferences(currentUser.uid, newPrefs);
    const updated = { ...currentUser, preferences: newPrefs };
    setCurrentUser(updated);
    localStorage.setItem('sakan_current_user', JSON.stringify(updated));

    // Refresh notifications based on updated preferences
    const refreshed = getUserNotifications(currentUser.uid, properties);
    setNotifications(refreshed);
  };

  // Require auth modal for unregistered visitors
  const [authRequirementAction, setAuthRequirementAction] = useState<AuthRequiredAction | null>(null);
  const [pendingPropertyForAuth, setPendingPropertyForAuth] = useState<Property | null>(null);

  const handleRequireAuth = (actionType: AuthRequiredAction, property?: Property) => {
    setPendingPropertyForAuth(property || null);
    setAuthRequirementAction(actionType);
  };

  // Search & Filters state
  const [selectedType, setSelectedType] = useState<PropertyType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(50000000);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthOpen(true);
  };

  // Sync auth state observer from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid, fbUser.email || undefined);
        if (profile) {
          setCurrentUser(profile);
          localStorage.setItem('sakan_current_user', JSON.stringify(profile));
        }
      } else {
        const saved = localStorage.getItem('sakan_current_user');
        if (!saved) {
          setCurrentUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Deep-linking: auto-open property if URL contains ?property=<id> or ?prop=<id>
  useEffect(() => {
    if (properties.length === 0) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const propId = urlParams.get('property') || urlParams.get('prop') || urlParams.get('id');
      if (propId && (!selectedProperty || selectedProperty.id !== propId)) {
        const target = properties.find((p) => p.id === propId);
        if (target) {
          setSelectedProperty(target);
        }
      }
    } catch {
      // ignore
    }
  }, [properties]);

  // Fetch registered users list for the owner dashboard
  useEffect(() => {
    async function loadUsers() {
      try {
        const allUsers = await fetchAllRegisteredUsers();
        setUsers(allUsers);
      } catch (err) {
        console.warn('Error fetching registered users:', err);
      }
    }
    loadUsers();
  }, []);

  // Fetch Firestore properties on load
  useEffect(() => {
    async function loadRemote() {
      try {
        const remoteProps = await fetchRemoteProperties();
        if (remoteProps && remoteProps.length > 0) {
          setProperties((prev) => {
            const existingIds = new Set(remoteProps.map((p) => p.id));
            const merged = [...remoteProps, ...prev.filter((p) => !existingIds.has(p.id))];
            localStorage.setItem('sakan_local_properties', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn('Initial remote load failed (using cached listings):', err);
      }
    }
    loadRemote();
  }, []);

  // Admin Real-time Sync & Performance Optimization
  const [isAdminRefreshing, setIsAdminRefreshing] = useState(false);
  const [lastAdminSync, setLastAdminSync] = useState<number>(() => Date.now());

  /**
   * دالة التحديث والمزامنة الموحدة المعتمدة على onSnapshot من Firestore
   * تقوم بمزامنة العقارات والمستخدمين والطلبات المعلقة لحظياً بين Firebase ولوحة تحكم المالك
   * وتضمن أن أي تغيير في حالة العقار أو تسجيل مستخدم جديد يظهر فوراً للمالك بدون تحديث الصفحة
   */
  const setupUnifiedFirestoreSync = useCallback(() => {
    let unsubProps = () => {};
    let unsubUsers = () => {};
    let unsubBookings = () => {};

    // 1. مزامنة العقارات لحظياً (onSnapshot) مع تتبع أي تغيير في حالة العقار فوراً
    try {
      const qProps = collection(db, 'properties');
      unsubProps = onSnapshot(
        qProps,
        (snapshot) => {
          const remoteProps: Property[] = [];
          snapshot.forEach((docSnap) => {
            remoteProps.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<Property, 'id'>)
            });
          });
          remoteProps.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

          // تتبع التعديلات اللحظية في العقارات بدون إعادة تحميل الصفحة
          snapshot.docChanges().forEach((change) => {
            const propData = change.doc.data() as Property;
            const propId = change.doc.id;

            if (change.type === 'modified') {
              // تحديث فوري للعقار المفتوح في النافذة المنبثقة إن كان معروضاً حالياً
              setSelectedProperty((current) => {
                if (current && current.id === propId) {
                  return { ...current, ...propData };
                }
                return current;
              });

              if (currentUser?.role === 'admin') {
                const statusLabel =
                  propData.status === 'active'
                    ? 'تم اعتماده ونشره بنجاح'
                    : propData.status === 'sold'
                    ? 'تم التعاقد'
                    : 'معلق بانتظار الاعتماد';
                showToast(`🔄 تحديث حالة عقار "${propData.title || propId}": ${statusLabel}`, 'info');
              }
            } else if (change.type === 'added' && !snapshot.metadata.fromCache) {
              if (currentUser?.role === 'admin' && propData.status === 'pending') {
                showToast(`🔔 عقار جديد معلق بانتظار الاعتماد: "${propData.title}"`, 'info');
              }
            }
          });

          if (remoteProps.length > 0) {
            setProperties((prev) => {
              const remoteIds = new Set(remoteProps.map((p) => p.id));
              const localPending = prev.filter((p) => !remoteIds.has(p.id));
              const merged = [...remoteProps, ...localPending];
              localStorage.setItem('sakan_local_properties', JSON.stringify(merged));
              return merged;
            });
            setLastAdminSync(Date.now());
          }
        },
        (err) => {
          console.warn('Real-time properties onSnapshot notice:', err);
        }
      );
    } catch (err) {
      console.warn('Could not establish properties onSnapshot listener:', err);
    }

    // 2. مزامنة المستخدمين لحظياً (onSnapshot) لضمان ظهور أي مستخدم جديد فوراً للمالك
    try {
      const qUsers = collection(db, 'users');
      unsubUsers = onSnapshot(
        qUsers,
        (snapshot) => {
          const remoteUsers: UserProfile[] = [];
          snapshot.forEach((docSnap) => {
            remoteUsers.push({
              uid: docSnap.id,
              ...(docSnap.data() as Omit<UserProfile, 'uid'>)
            });
          });
          remoteUsers.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

          // رصد المستخدمين الجدد وطلبات تراخيص النشر في الوقت الحقيقي
          snapshot.docChanges().forEach((change) => {
            const userData = change.doc.data() as UserProfile;
            if (change.type === 'added' && !snapshot.metadata.fromCache) {
              if (currentUser?.role === 'admin') {
                showToast(`👤 انضمام مستخدم جديد: "${userData.name || userData.phone}"`, 'info');
              }
            } else if (change.type === 'modified') {
              if (currentUser?.role === 'admin' && userData.publishingRequestStatus === 'pending') {
                showToast(`📝 طلب ترخيص نشر عقارات من: "${userData.name || userData.phone}"`, 'info');
              }
            }
          });

          // دمج المستخدمين مع قاعدة الحسابات المسجلة والحسابات المحلية
          const deletedPhones = getDeletedUserPhones();
          const map = new Map<string, UserProfile>();

          INITIAL_REGISTERED_USERS.forEach((u) => {
            if (!deletedPhones.has(u.phone)) map.set(u.phone, u);
          });

          const localSaved = localStorage.getItem('sakan_all_registered_users');
          if (localSaved) {
            try {
              const parsed: UserProfile[] = JSON.parse(localSaved);
              parsed.forEach((u) => {
                if (!deletedPhones.has(u.phone)) map.set(u.phone, u);
              });
            } catch {}
          }

          const accounts = getRegisteredAccounts();
          Object.values(accounts).forEach((acc) => {
            if (acc.profile && !deletedPhones.has(acc.phone)) {
              map.set(acc.phone, acc.profile);
            }
          });

          remoteUsers.forEach((u) => {
            if (!deletedPhones.has(u.phone)) map.set(u.phone, u);
          });

          // حماية المالك الأساسي وحصانته الإدارية
          map.set(MASTER_OWNER_PHONE, {
            ...INITIAL_REGISTERED_USERS[0],
            status: 'active',
            canPublish: true,
            publishingRequestStatus: 'approved'
          });

          const unifiedList = Array.from(map.values()).sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
          setUsers(unifiedList);
          localStorage.setItem('sakan_all_registered_users', JSON.stringify(unifiedList));
          setLastAdminSync(Date.now());
        },
        (err) => {
          console.warn('Real-time users onSnapshot notice:', err);
        }
      );
    } catch (err) {
      console.warn('Could not establish users onSnapshot listener:', err);
    }

    // 3. مزامنة طلبات المعاينة والحجوزات لحظياً (onSnapshot)
    try {
      const qBookings = collection(db, 'bookings');
      unsubBookings = onSnapshot(
        qBookings,
        (snapshot) => {
          const remoteBookings: BookingRequest[] = [];
          snapshot.forEach((docSnap) => {
            remoteBookings.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<BookingRequest, 'id'>)
            });
          });
          remoteBookings.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

          if (remoteBookings.length > 0) {
            setBookings((prev) => {
              const remoteIds = new Set(remoteBookings.map((b) => b.id));
              const localOnly = prev.filter((b) => !remoteIds.has(b.id));
              const merged = [...remoteBookings, ...localOnly];
              localStorage.setItem('sakan_bookings', JSON.stringify(merged));
              return merged;
            });
          }
        },
        () => {
          // Graceful fallback for bookings
        }
      );
    } catch {
      // ignore
    }

    // 4. مزامنة لحظية عبر خادم SSE المتصل بكافة الأجهزة والعناوين المختلفة (Cross-device real-time sync)
    connectSyncStream();
    const unsubSse = addSyncEventListener((event) => {
      if (event.type === 'user_registered') {
        const newUser = event.data.user;
        if (newUser) {
          setUsers((prev) => [newUser, ...prev.filter((u) => u.uid !== newUser.uid && u.phone !== newUser.phone)]);
          if (currentUser?.role === 'admin') {
            showToast(`👤 انضمام مستخدم جديد: "${newUser.name || newUser.phone}" - متاح للمعاينة ومنح الصلاحيات`, 'info');
          }
        }
      } else if (event.type === 'user_updated') {
        const { uid, canPublish, publishingRequestStatus } = event.data;
        const cleanUid = uid.replace('user-', '');
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === uid || u.phone === cleanUid
              ? { ...u, canPublish, publishingRequestStatus }
              : u
          )
        );
        setCurrentUser((curr) => {
          if (curr && (curr.uid === uid || curr.phone === cleanUid)) {
            const updated = { ...curr, canPublish, publishingRequestStatus };
            localStorage.setItem('sakan_current_user', JSON.stringify(updated));
            return updated;
          }
          return curr;
        });
      } else if (event.type === 'user_deleted') {
        const { uid, phone } = event.data;
        setUsers((prev) => prev.filter((u) => u.uid !== uid && u.phone !== phone));
      } else if (event.type === 'property_added') {
        const newProp = event.data.property;
        if (newProp) {
          setProperties((prev) => [newProp, ...prev.filter((p) => p.id !== newProp.id)]);
          if (currentUser?.role === 'admin') {
            if (newProp.status === 'pending') {
              showToast(`🔔 عقار جديد معلق بانتظار موافقتك واعتمادك: "${newProp.title}"`, 'info');
            } else {
              showToast(`✨ عقار جديد نُشر للتو في الموقع: "${newProp.title}"`, 'success');
            }
          }
        }
      } else if (event.type === 'property_updated') {
        const { id, updates } = event.data;
        setProperties((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
        );
        setSelectedProperty((curr) => (curr && curr.id === id ? { ...curr, ...updates } : curr));
      } else if (event.type === 'property_deleted') {
        const { id } = event.data;
        setProperties((prev) => prev.filter((p) => p.id !== id));
      } else if (event.type === 'notification_added') {
        if (event.data) {
          setAdminNotifications((prev) => [event.data, ...prev.filter((n) => n.id !== event.data.id)]);
        }
      } else if (event.type === 'booking_added') {
        if (event.data?.booking) {
          setBookings((prev) => [event.data.booking, ...prev.filter((b) => b.id !== event.data.booking.id)]);
        }
      }
      setLastAdminSync(Date.now());
    });

    // إرجاع دالة إلغاء المزامنة الموحدة
    return () => {
      unsubProps();
      unsubUsers();
      unsubBookings();
      unsubSse();
    };
  }, [currentUser?.role]);

  // تشغيل دالة التحديث الموحدة لحظياً لمزامنة البيانات بدون تحديث الصفحة
  useEffect(() => {
    const unsubscribeSync = setupUnifiedFirestoreSync();
    return () => {
      unsubscribeSync();
    };
  }, [setupUnifiedFirestoreSync]);

  // Fast on-demand admin data refresh from Firebase
  const handleRefreshAdminData = async () => {
    setIsAdminRefreshing(true);
    try {
      const [freshUsers, freshProps] = await Promise.all([
        fetchAllRegisteredUsers(true),
        fetchRemoteProperties(true)
      ]);
      if (freshUsers && freshUsers.length > 0) setUsers(freshUsers);
      if (freshProps && freshProps.length > 0) {
        setProperties((prev) => {
          const existingIds = new Set(freshProps.map((p) => p.id));
          const merged = [...freshProps, ...prev.filter((p) => !existingIds.has(p.id))];
          localStorage.setItem('sakan_local_properties', JSON.stringify(merged));
          return merged;
        });
      }
      setLastAdminSync(Date.now());
      showToast('تم تحديث ومزامنة أحدث بيانات لوحة التحكم بنجاح', 'success');
    } catch (err) {
      console.warn('Notice on refreshing admin data:', err);
      showToast('تم اعتماد البيانات المحلية بسرعة فائقة', 'info');
    } finally {
      setIsAdminRefreshing(false);
    }
  };

  // Save properties locally whenever changed
  useEffect(() => {
    localStorage.setItem('sakan_local_properties', JSON.stringify(properties));
  }, [properties]);

  // Save bookings
  useEffect(() => {
    localStorage.setItem('sakan_bookings', JSON.stringify(bookings));
  }, [bookings]);

  // Add new property
  const handleAddProperty = async (propertyData: Omit<Property, 'id'>) => {
    const newId = await addRemoteProperty(propertyData);
    const newProperty: Property = {
      id: newId,
      ...propertyData
    };
    setProperties((prev) => [newProperty, ...prev]);

    // Dispatch instant notification to Master Owner
    const ownerNameDisplay = currentUser?.name || propertyData.ownerName || 'مستخدم مسجل';
    const ownerPhoneDisplay = currentUser?.phone || propertyData.contactPhone || '';
    addAdminNotification({
      id: `notif-prop-${Date.now()}-${newId}`,
      type: 'new_property',
      title: propertyData.status === 'pending' ? 'عقار جديد ينتظر الاعتماد' : 'إعلان عقار جديد',
      message: `قام المعلن "${ownerNameDisplay}" (${ownerPhoneDisplay}) بإضافة عقار جديد: "${propertyData.title}" في (${propertyData.location}) بسعر ${Number(propertyData.price).toLocaleString()} ج.م.`,
      createdAt: Date.now(),
      read: false,
      linkType: 'pending',
      propertyId: newId,
      propertyTitle: propertyData.title,
      userId: currentUser?.uid,
      userName: ownerNameDisplay,
      userPhone: ownerPhoneDisplay
    });

    // Check if new property matches registered user's preferences & trigger in-app notification!
    if (currentUser) {
      const { matches, matchedCity } = checkPropertyMatchesPreferences(newProperty, userPreferences);
      if (matches && matchedCity) {
        const newNotif = createNotificationFromProperty(newProperty, currentUser.uid, matchedCity);
        setNotifications((prev) => {
          const updated = [newNotif, ...prev];
          saveUserNotifications(currentUser.uid, updated);
          return updated;
        });
        showToast(`🔔 عقار جديد يطابق اهتماماتك في ${matchedCity}: ${newProperty.title}`, 'success');
      }
    }
  };

  // Update property status
  const handleUpdatePropertyStatus = async (id: string, status: 'active' | 'pending' | 'sold') => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    await updateRemoteProperty(id, { status });
  };

  // Toggle featured
  const handleToggleFeatured = async (id: string) => {
    let newFeatured = false;
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          newFeatured = !p.featured;
          return { ...p, featured: newFeatured };
        }
        return p;
      })
    );
    await updateRemoteProperty(id, { featured: newFeatured });
  };

  // Delete property
  const handleDeleteProperty = async (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    await deleteRemoteProperty(id);
  };

  // Inspection booking
  const handleRequestBooking = (bookingData: {
    propertyId: string;
    propertyTitle: string;
    clientName: string;
    clientPhone: string;
    date: string;
    notes?: string;
  }) => {
    const newBooking: BookingRequest = {
      id: 'book-' + Date.now(),
      ...bookingData,
      createdAt: Date.now()
    };
    setBookings((prev) => [newBooking, ...prev]);

    // Dispatch instant notification to Master Owner
    addAdminNotification({
      id: `notif-book-${Date.now()}-${bookingData.propertyId}`,
      type: 'booking_request',
      title: 'طلب معاينة عقار جديد',
      message: `طلب معاينة لعقار "${bookingData.propertyTitle}" من العميل "${bookingData.clientName}" (${bookingData.clientPhone}) بتاريخ ${bookingData.date}.`,
      createdAt: Date.now(),
      read: false,
      linkType: 'bookings',
      propertyId: bookingData.propertyId,
      propertyTitle: bookingData.propertyTitle,
      userName: bookingData.clientName,
      userPhone: bookingData.clientPhone
    });

    // Sync to shared server API so all devices see the booking
    apiAddBooking(newBooking).catch(() => {});

    // Background sync to Firestore bookings collection
    try {
      addDoc(collection(db, 'bookings'), newBooking).catch(() => {});
    } catch {}
  };

  // Add 5-star rating and review by registered users
  const handleAddReview = (propertyId: string, rating: number, comment: string) => {
    if (!currentUser) return;

    const newReview: PropertyReview = {
      id: 'rev-' + Date.now(),
      propertyId,
      userId: currentUser.uid,
      userName: currentUser.name || `مستخدم ${currentUser.phone.slice(-4)}`,
      userPhone: currentUser.phone,
      rating,
      comment,
      createdAt: Date.now()
    };

    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === propertyId) {
          const prevReviews = p.reviews || [];
          // Replace if user already reviewed or append to list
          const existingIdx = prevReviews.findIndex(
            (r) => r.userId === currentUser.uid || (r.userPhone && r.userPhone === currentUser.phone)
          );
          let updatedReviews: PropertyReview[];
          if (existingIdx >= 0) {
            updatedReviews = [...prevReviews];
            updatedReviews[existingIdx] = newReview;
          } else {
            updatedReviews = [newReview, ...prevReviews];
          }

          const avg = Number(
            (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1)
          );

          const updatedProp: Property = {
            ...p,
            reviews: updatedReviews,
            reviewsCount: updatedReviews.length,
            averageRating: avg
          };

          if (selectedProperty && selectedProperty.id === propertyId) {
            setSelectedProperty(updatedProp);
          }

          // Persist to remote
          updateRemoteProperty(propertyId, {
            reviews: updatedReviews,
            reviewsCount: updatedReviews.length,
            averageRating: avg
          });

          return updatedProp;
        }
        return p;
      })
    );
  };

  // Owner action: Toggle publishing permissions for registered users
  const handleToggleUserPublishPermission = async (uid: string, currentPermission: boolean) => {
    const newPermission = !currentPermission;
    const requestStatus: 'approved' | 'none' = newPermission ? 'approved' : 'none';

    setUsers((prev) =>
      prev.map((u) =>
        u.uid === uid
          ? { ...u, canPublish: newPermission, publishingRequestStatus: requestStatus }
          : u
      )
    );

    if (currentUser?.uid === uid) {
      const updated: UserProfile = {
        ...currentUser,
        canPublish: newPermission,
        publishingRequestStatus: requestStatus
      };
      setCurrentUser(updated);
      localStorage.setItem('sakan_current_user', JSON.stringify(updated));
    }

    await updateUserPublishingPermission(uid, newPermission, requestStatus);
  };

  // User action: Request publishing permission from the Master Owner
  const handleRequestPublishingPermission = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === userId ? { ...u, publishingRequestStatus: 'pending' } : u
      )
    );

    if (currentUser?.uid === userId) {
      const updated = { ...currentUser, publishingRequestStatus: 'pending' as const };
      setCurrentUser(updated);
      localStorage.setItem('sakan_current_user', JSON.stringify(updated));
    }

    // Dispatch instant notification to Master Owner
    const userNameDisplay = currentUser?.name || 'مستخدم مسجل';
    const userPhoneDisplay = currentUser?.phone || '';
    addAdminNotification({
      id: `notif-pub-${Date.now()}-${userId}`,
      type: 'publish_request',
      title: 'طلب ترخيص ونشر عقارات',
      message: `المستخدم "${userNameDisplay}" (${userPhoneDisplay}) يرغب في الحصول على ترخيص وصلاحية نشر العقارات.`,
      createdAt: Date.now(),
      read: false,
      linkType: 'pending',
      userId,
      userName: userNameDisplay,
      userPhone: userPhoneDisplay,
      userRole: currentUser?.role || 'client'
    });

    await updateUserPublishingPermission(userId, false, 'pending');
  };

  // Master Owner action: Add new user account (any role, limited/full permissions)
  const handleAddUserAccount = async (userData: {
    name: string;
    phone: string;
    password?: string;
    role: UserRole;
    canPublish: boolean;
    status?: 'active' | 'pending';
  }) => {
    const result = await createNewUserAccountByAdmin(userData);
    if (result.success && result.profile) {
      setUsers((prev) => [result.profile!, ...prev]);
    }
    return result;
  };

  // Master Owner action: Delete user account (guaranteed master owner immunity)
  const handleDeleteUserAccount = async (uid: string, phone: string) => {
    const result = await deleteUserAccountByAdmin(uid, phone);
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.uid !== uid && u.phone !== phone));
    }
    return result;
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    localStorage.removeItem('sakan_current_user');
    showToast('تم تسجيل الخروج بنجاح', 'info');
  };

  // Direct contact WhatsApp
  const handleDirectContactWhatsapp = (property: Property) => {
    const targetWhatsapp = property.whatsapp || MASTER_OWNER_PHONE;
    const message = encodeURIComponent(
      `مرحباً سكن بلس، أستفسر بخصوص العقار المعروض: "${property.title}" (كود: ${property.id}) بسعر ${Number(
        property.price
      ).toLocaleString()} ج.م`
    );
    window.open(`https://wa.me/${targetWhatsapp}?text=${message}`, '_blank');
  };

  // Filtered & Sorted properties list
  const filteredProperties = useMemo(() => {
    const isMaster = currentUser ? isMasterAdmin(currentUser.phone) : false;

    return properties.filter((prop) => {
      // Check type (sale/rent)
      if (selectedType !== 'all' && prop.type !== selectedType) {
        return false;
      }

      // Check category
      if (selectedCategory !== 'all' && prop.category !== selectedCategory) {
        return false;
      }

      // Check city / location (including specific Baltim beaches)
      if (selectedCity !== 'الكل') {
        const fullPropLocation = `${prop.location} ${prop.addressDetails || ''} ${prop.title}`;
        if (selectedCity.includes('مصيف بلطيم - شاطئ')) {
          const targetBeach = selectedCity.split('-')[1]?.trim() || '';
          if (!fullPropLocation.includes(targetBeach)) {
            return false;
          }
        } else if (selectedCity.includes('مصيف بلطيم')) {
          if (!fullPropLocation.includes('مصيف بلطيم') && !fullPropLocation.includes('بلطيم')) {
            return false;
          }
        } else if (selectedCity.includes('مارينا دلتا')) {
          if (!fullPropLocation.includes('مارينا دلتا')) {
            return false;
          }
        } else if (selectedCity.includes('الصيادلة')) {
          if (!fullPropLocation.includes('الصيادلة') && !fullPropLocation.includes('صيدلة')) {
            return false;
          }
        } else if (selectedCity.includes('بلو بيتش') || selectedCity.includes('مارينا بلو')) {
          if (!fullPropLocation.includes('بلو بيتش') && !fullPropLocation.includes('مارينا بلو')) {
            return false;
          }
        } else {
          const cityName = selectedCity.split('،')[0].replace(/\(.*\)/g, '').trim();
          const govName = selectedCity.includes('،') ? selectedCity.split('،')[1].trim() : '';
          const match = prop.location.includes(cityName) || (govName && prop.location.includes(govName));
          if (!match) {
            return false;
          }
        }
      }

      // Check price
      if (prop.price > maxPrice) {
        return false;
      }

      // Check only featured
      if (onlyFeatured && !prop.featured) {
        return false;
      }

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = prop.title.toLowerCase().includes(q);
        const inDesc = prop.description.toLowerCase().includes(q);
        const inLoc = prop.location.toLowerCase().includes(q);
        const inAddress = prop.addressDetails?.toLowerCase().includes(q) || false;
        const inCode = prop.id.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inLoc && !inAddress && !inCode) {
          return false;
        }
      }

      // Publishing Approval Rule:
      // If property status is pending, it should NOT appear to public visitors!
      // Only the Master Owner or the user who created it can see it.
      if (prop.status === 'pending' && !isMaster && prop.ownerId !== currentUser?.uid) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });
  }, [properties, selectedType, selectedCategory, selectedCity, maxPrice, onlyFeatured, searchQuery, sortBy, currentUser]);

  // User's own listings
  const userProperties = useMemo(() => {
    if (!currentUser) return [];
    return properties.filter((p) => p.ownerId === currentUser.uid);
  }, [properties, currentUser]);

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedCity('الكل');
    setSearchQuery('');
    setMaxPrice(50000000);
    setOnlyFeatured(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Header / Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenAddProperty={() => {
          if (!currentUser) {
            showToast('يرجى تسجيل الدخول أولاً للإعلان عن عقار', 'info');
            handleOpenAuth('login');
          } else {
            setIsAddPropertyOpen(true);
          }
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
        activeFilterType={selectedType}
        onSelectFilterType={(type) => {
          setSelectedType(type);
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }}
        notifications={notifications}
        onSelectPropertyById={handleSelectPropertyById}
        onMarkAllAsRead={handleMarkAllAsRead}
        onMarkAsRead={handleMarkAsRead}
        onDeleteNotification={handleDeleteNotification}
        onOpenInterestsModal={() => setIsInterestsOpen(true)}
        adminAlertsCount={adminAlertsCount}
      />

      {/* Main Hero with Search */}
      <Hero
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        onResetFilters={resetFilters}
      />

      {/* Main Content Listings */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        
        {/* Results Bar / Sort & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {selectedType === 'all'
                  ? 'جميع العقارات المتاحة'
                  : selectedType === 'sale'
                  ? 'عقارات معروضة للبيع'
                  : 'عقارات معروضة للإيجار'}
              </h2>
              <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono">
                {filteredProperties.length} عقار
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              اختر العقار المناسب وتواصل مباشرة لمعاينة الموقع على أرض الواقع
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
            {/* Toggle Featured Filter */}
            <button
              onClick={() => setOnlyFeatured(!onlyFeatured)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                onlyFeatured
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>المميزة فقط</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent outline-none cursor-pointer"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="price_asc">الأقل سعراً</option>
                <option value="price_desc">الأعلى سعراً</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <div className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs max-w-xl mx-auto">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">لم يتم العثور على نتائج</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              جرّب تغيير كلمات البحث أو إعادة ضبط خيارات الفلترة لعرض عقارات أخرى.
            </p>
            <button
              onClick={resetFilters}
              className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              عرض كافة العقارات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredProperties.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                currentUser={currentUser}
                onSelectProperty={(p) => setSelectedProperty(p)}
                onDirectContactWhatsapp={handleDirectContactWhatsapp}
                onRequireAuth={(actionType, property) => handleRequireAuth(actionType, property)}
              />
            ))}
          </div>
        )}

        {/* Add Property Banner Callout */}
        <div className="mt-16 bg-gradient-to-r from-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-2 text-center md:text-right">
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-400/10 px-3 py-1 rounded-full">
              <Building2 className="w-3.5 h-3.5" />
              <span>ملاك ومطورو العقارات</span>
            </div>
            <h3 className="text-2xl font-black">هل لديك عقار تريد بيعه أو تأجيره؟</h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              اعرض وحدتك على منصة سكن بلس لتصل إلى آلاف المشترين والمستأجرين المهتمين يومياً بعد اعتماد المالك الأساسي.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (!currentUser) {
                  showToast('يرجى تسجيل الدخول أولاً', 'info');
                  handleOpenAuth('login');
                } else {
                  setIsAddPropertyOpen(true);
                }
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition hover:scale-105 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>أضف عقارك الآن</span>
            </button>
          </div>
        </div>

      </main>

      {/* Floating WhatsApp Action Button */}
      <aside aria-label="تواصل واتساب" className="fixed bottom-6 left-6 z-40">
        <a
          href="https://wa.me/201007775402?text=مرحباً%20سكن%20بلس%20أريد%20التواصل%20بخصوص%20العقارات"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-2xl transition hover:scale-110 active:scale-95"
          title="تواصل مباشر عبر واتساب (01007775402)"
        >
          <MessageCircle className="w-6 h-6 fill-current" />
          <span className="hidden sm:inline-block text-xs font-bold pr-1">تواصل عبر واتساب</span>
        </a>
      </aside>

      {/* Footer */}
      <Footer
        onSelectCity={(city) => {
          setSelectedCity(city);
        }}
        onSelectCategory={(category) => {
          setSelectedCategory(category);
        }}
        onOpenAddProperty={() => {
          if (!currentUser) {
            handleOpenAuth('login');
          } else {
            setIsAddPropertyOpen(true);
          }
        }}
        onShowToast={showToast}
      />

      {/* Modals */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          currentUser={currentUser}
          onClose={() => setSelectedProperty(null)}
          onRequestBooking={handleRequestBooking}
          onAddReview={handleAddReview}
          onOpenAuth={() => handleOpenAuth('login')}
          onRequireAuth={(actionType) => handleRequireAuth(actionType, selectedProperty)}
          onShowToast={showToast}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setIsAuthOpen(false)}
          onSuccessLogin={(profile) => {
            setCurrentUser(profile);
            localStorage.setItem('sakan_current_user', JSON.stringify(profile));
            setUsers((prev) => {
              const idx = prev.findIndex((u) => u.uid === profile.uid || u.phone === profile.phone);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...profile };
                return copy;
              }
              return [profile, ...prev];
            });

            // Resume the pending action that the user was trying to perform
            if (pendingPropertyForAuth) {
              const target = pendingPropertyForAuth;
              const action = authRequirementAction;
              setTimeout(() => {
                if (action === 'details') {
                  setSelectedProperty(target);
                } else if (action === 'whatsapp') {
                  handleDirectContactWhatsapp(target);
                } else if (action === 'call') {
                  const phone = target.contactPhone || MASTER_OWNER_PHONE;
                  window.location.href = `tel:${phone}`;
                }
              }, 250);
            }
            setPendingPropertyForAuth(null);
            setAuthRequirementAction(null);
          }}
          onShowToast={showToast}
        />
      )}

      {isAddPropertyOpen && (
        <AddPropertyModal
          currentUser={currentUser}
          onClose={() => setIsAddPropertyOpen(false)}
          onAddProperty={handleAddProperty}
          onRequestPublishingPermission={handleRequestPublishingPermission}
          onShowToast={showToast}
        />
      )}

      {isAdminOpen && currentUser?.role === 'admin' && (
        <AdminPanel
          properties={properties}
          bookings={bookings}
          users={users}
          onClose={() => setIsAdminOpen(false)}
          onUpdatePropertyStatus={handleUpdatePropertyStatus}
          onToggleFeatured={handleToggleFeatured}
          onDeleteProperty={handleDeleteProperty}
          onToggleUserPublishPermission={handleToggleUserPublishPermission}
          onSelectProperty={(prop) => {
            setIsAdminOpen(false);
            setSelectedProperty(prop);
          }}
          onRefreshData={handleRefreshAdminData}
          isRefreshing={isAdminRefreshing}
          lastSyncTime={lastAdminSync}
          onShowToast={showToast}
          onAddUserAccount={handleAddUserAccount}
          onDeleteUserAccount={handleDeleteUserAccount}
          adminNotifications={adminNotifications}
          onMarkAdminNotificationRead={(id) => {
            const updated = markAdminNotificationRead(id);
            setAdminNotifications(updated);
          }}
          onMarkAllAdminNotificationsRead={() => {
            const updated = markAllAdminNotificationsRead();
            setAdminNotifications(updated);
          }}
          onDeleteAdminNotification={(id) => {
            const updated = deleteAdminNotification(id);
            setAdminNotifications(updated);
          }}
        />
      )}

      {isProfileOpen && currentUser && (
        <UserProfileModal
          currentUser={currentUser}
          userProperties={userProperties}
          onClose={() => setIsProfileOpen(false)}
          onOpenAddProperty={() => setIsAddPropertyOpen(true)}
          onSelectProperty={(p) => {
            setIsProfileOpen(false);
            setSelectedProperty(p);
          }}
          onLogout={handleLogout}
          onOpenInterestsModal={() => setIsInterestsOpen(true)}
        />
      )}

      {/* User Property Interests & City Notifications Modal */}
      {isInterestsOpen && currentUser && (
        <UserInterestsModal
          initialPreferences={userPreferences}
          properties={properties}
          onClose={() => setIsInterestsOpen(false)}
          onSavePreferences={handleSaveUserPreferences}
          onShowToast={showToast}
        />
      )}

      {/* Unregistered visitor prompt modal */}
      {authRequirementAction && (
        <RequireAuthModal
          actionType={authRequirementAction}
          onClose={() => {
            setAuthRequirementAction(null);
            setPendingPropertyForAuth(null);
          }}
          onOpenAuth={(mode = 'login') => {
            setAuthRequirementAction(null);
            handleOpenAuth(mode);
          }}
        />
      )}

    </div>
  );
}
