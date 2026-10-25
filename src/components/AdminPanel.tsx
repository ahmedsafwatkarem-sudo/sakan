import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, 
  Building2, 
  CheckCircle, 
  Clock, 
  Trash2, 
  Star, 
  Calendar, 
  Phone, 
  MessageCircle,
  Eye,
  Check,
  Ban,
  Users,
  UserCheck,
  ShieldAlert,
  Crown,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Sparkles,
  XCircle,
  FileCheck2,
  UserPlus,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Key,
  Save,
  CheckCheck,
  Lock,
  Bell,
  ExternalLink,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { AdminAnalyticsCharts } from './AdminAnalyticsCharts';
import { Property, BookingRequest, UserProfile, UserRole, AdminNotification } from '../types';
import { 
  MASTER_OWNER_PHONE, 
  getLastAdminEditTime, 
  setLastAdminEditTime, 
  isMasterAdmin,
  subscribeToRegisteredUsers,
  subscribeToRemoteProperties,
  getDeletedUserPhones,
  INITIAL_REGISTERED_USERS,
  getRegisteredAccounts,
  db
} from '../firebase';
import { formatRelativeTimeArabic } from '../utils/notificationUtils';
import { addSyncEventListener } from '../utils/apiSync';

interface AdminPanelProps {
  properties: Property[];
  bookings: BookingRequest[];
  users: UserProfile[];
  onClose: () => void;
  onUpdatePropertyStatus: (id: string, status: 'active' | 'pending' | 'sold') => void;
  onToggleFeatured: (id: string) => void;
  onDeleteProperty: (id: string) => void;
  onToggleUserPublishPermission: (uid: string, currentPermission: boolean) => void;
  onSelectProperty: (property: Property) => void;
  onRefreshData?: () => Promise<void>;
  isRefreshing?: boolean;
  lastSyncTime?: number;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onAddUserAccount?: (userData: {
    name: string;
    phone: string;
    password?: string;
    role: UserRole;
    canPublish: boolean;
    status?: 'active' | 'pending';
  }) => Promise<{ success: boolean; error?: string; profile?: UserProfile }>;
  onDeleteUserAccount?: (uid: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  adminNotifications?: AdminNotification[];
  onMarkAdminNotificationRead?: (id: string) => void;
  onMarkAllAdminNotificationsRead?: () => void;
  onDeleteAdminNotification?: (id: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  properties,
  bookings,
  users,
  onClose,
  onUpdatePropertyStatus,
  onToggleFeatured,
  onDeleteProperty,
  onToggleUserPublishPermission,
  onSelectProperty,
  onRefreshData,
  isRefreshing = false,
  lastSyncTime,
  onShowToast,
  onAddUserAccount,
  onDeleteUserAccount,
  adminNotifications = [],
  onMarkAdminNotificationRead = () => {},
  onMarkAllAdminNotificationsRead = () => {},
  onDeleteAdminNotification = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'properties' | 'bookings' | 'notifications' | 'analytics'>('users');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'sold'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'client' | 'owner' | 'renter' | 'pending_request'>('all');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [propSearchTerm, setPropSearchTerm] = useState('');
  const [bookingSearchTerm, setBookingSearchTerm] = useState('');
  const [notifSearchTerm, setNotifSearchTerm] = useState('');
  const [notifTypeFilter, setNotifTypeFilter] = useState<'all' | 'new_user' | 'new_property' | 'publish_request' | 'booking_request'>('all');
  const [notifLimit, setNotifLimit] = useState(100);

  // Slicing / Pagination limits for high-performance DOM rendering (shows all users and properties by default)
  const [userLimit, setUserLimit] = useState(150);
  const [propLimit, setPropLimit] = useState(150);
  const [bookingLimit, setBookingLimit] = useState(100);

  // Tracking last admin edit timestamp for instant persistence indication
  const [lastAdminEditTime, setLastAdminEditTimeState] = useState<number>(() => getLastAdminEditTime());

  // Optimistic local state overrides: ensures instant 0ms UI response upon user clicks
  const [userPermissionOverrides, setUserPermissionOverrides] = useState<
    Record<string, { canPublish: boolean; publishingRequestStatus: 'approved' | 'none' }>
  >({});
  const [propertyStatusOverrides, setPropertyStatusOverrides] = useState<Record<string, 'active' | 'pending' | 'sold'>>({});
  const [propertyFeaturedOverrides, setPropertyFeaturedOverrides] = useState<Record<string, boolean>>({});
  const [deletedPropertyIds, setDeletedPropertyIds] = useState<Set<string>>(new Set());

  // Account creation & deletion optimistic states
  const [locallyDeletedUserIds, setLocallyDeletedUserIds] = useState<Set<string>>(new Set());
  const [locallyAddedUsers, setLocallyAddedUsers] = useState<UserProfile[]>([]);

  // Add User Account Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('client');
  const [newUserCanPublish, setNewUserCanPublish] = useState<boolean>(false);
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'pending'>('active');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Delete User Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Dedicated Live Firestore Real-Time Stream inside AdminPanel
  const [liveStreamedUsers, setLiveStreamedUsers] = useState<UserProfile[] | null>(null);
  const [liveStreamedProps, setLiveStreamedProps] = useState<Property[] | null>(null);
  const [liveStreamedBookings, setLiveStreamedBookings] = useState<BookingRequest[] | null>(null);

  // Set of record IDs that appeared for the first time while the owner is viewing the panel
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());

  // Refs to track initial snapshot load and known IDs across snapshots
  const isPropsInitializedRef = useRef(false);
  const isUsersInitializedRef = useRef(false);
  const isBookingsInitializedRef = useRef(false);
  const knownPropIdsRef = useRef<Set<string>>(new Set());
  const knownUserIdsRef = useRef<Set<string>>(new Set());
  const knownBookingIdsRef = useRef<Set<string>>(new Set());

  // Audio chime helper to alert owner in real time
  const playAlertChime = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Audio context may be restricted by browser until user gesture
    }
  }, []);

  // دالة ومستمع Firestore لحظي (onSnapshot) للعقارات والمستخدمين والطلبات مع docChanges()
  useEffect(() => {
    let unsubProps = () => {};
    let unsubUsers = () => {};
    let unsubBookings = () => {};

    // 1. مستمع Firestore للعقارات مع رصد docChanges() بدون إسقاط أي سجلات ناقصة الحقول
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

          const isInitial = !isPropsInitializedRef.current;
          snapshot.docChanges().forEach((change) => {
            const propData = change.doc.data() as Property;
            const docId = change.doc.id;

            if (change.type === 'added') {
              if (isInitial) {
                knownPropIdsRef.current.add(docId);
              } else if (!knownPropIdsRef.current.has(docId)) {
                // عقار جديد يظهر للمرة الأولى للمالك!
                knownPropIdsRef.current.add(docId);
                setNewlyArrivedIds((prev) => new Set([...prev, docId]));
                playAlertChime();
                const statusText = propData.status === 'pending' ? 'بانتظار موافقتك واعتمادك' : 'معتمد للنشر';
                onShowToast(
                  `🔔 عقار جديد يظهر للمرة الأولى في لوحة التحكم: "${propData.title || docId}" (${statusText})`,
                  propData.status === 'pending' ? 'info' : 'success'
                );
              }
            } else if (change.type === 'modified' && !isInitial) {
              const statusText =
                propData.status === 'active'
                  ? 'تم اعتماده ونشره بنجاح'
                  : propData.status === 'sold'
                  ? 'تم التعاقد'
                  : 'معلق بانتظار الاعتماد';
              onShowToast(`🔄 تحديث حالة عقار "${propData.title || docId}": ${statusText}`, 'info');
            }
          });

          isPropsInitializedRef.current = true;
          if (remoteProps.length > 0) {
            setLiveStreamedProps((prev) => {
              const map = new Map<string, Property>();
              (properties || []).forEach((p) => { if (p && p.id) map.set(p.id, p); });
              (prev || []).forEach((p) => { if (p && p.id) map.set(p.id, p); });
              remoteProps.forEach((p) => { if (p && p.id) map.set(p.id, p); });
              return Array.from(map.values()).sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
            });
          }
          setLastAdminEditTimeState(getLastAdminEditTime());
        },
        (err) => {
          console.warn('AdminPanel properties onSnapshot notice:', err);
        }
      );
    } catch (err) {
      console.warn('Could not establish AdminPanel properties listener:', err);
    }

    // 2. مستمع Firestore للمستخدمين والعملاء مع رصد docChanges() بدون إسقاط أي مستخدم
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

          const isInitial = !isUsersInitializedRef.current;
          snapshot.docChanges().forEach((change) => {
            const userData = change.doc.data() as UserProfile;
            const docId = change.doc.id;
            const userPhone = userData.phone || docId.replace('user-', '');

            if (change.type === 'added') {
              if (isInitial) {
                knownUserIdsRef.current.add(docId);
                if (userPhone) knownUserIdsRef.current.add(userPhone);
              } else if (!knownUserIdsRef.current.has(docId) && !knownUserIdsRef.current.has(userPhone)) {
                // مستخدم جديد ينضم للمرة الأولى للمالك!
                knownUserIdsRef.current.add(docId);
                if (userPhone) knownUserIdsRef.current.add(userPhone);
                setNewlyArrivedIds((prev) => new Set([...prev, docId, userPhone]));
                playAlertChime();
                const roleArabic =
                  userData.role === 'owner' ? 'مالك عقارات' : userData.role === 'renter' ? 'بائع / مؤجر' : 'عميل';
                onShowToast(
                  `👤 مستخدم جديد ينضم للمرة الأولى: "${userData.name || userPhone}" (${roleArabic}) - تم إدراجه فوراً باللوحة`,
                  'info'
                );
              }
            } else if (change.type === 'modified' && !isInitial) {
              if (userData.publishingRequestStatus === 'pending') {
                onShowToast(`📝 طلب ترخيص نشر عقارات من: "${userData.name || userPhone}"`, 'info');
              }
            }
          });

          isUsersInitializedRef.current = true;
          if (remoteUsers.length > 0) {
            setLiveStreamedUsers((prev) => {
              const activeDel = getDeletedUserPhones();
              const map = new Map<string, UserProfile>();
              INITIAL_REGISTERED_USERS.forEach((u) => {
                if (!activeDel.has(u.phone)) map.set(u.phone, u);
              });
              (users || []).forEach((u) => {
                const key = u.phone || u.uid;
                if (!activeDel.has(u.phone) && !activeDel.has(key)) map.set(key, u);
              });
              (prev || []).forEach((u) => {
                const key = u.phone || u.uid;
                if (!activeDel.has(u.phone) && !activeDel.has(key)) map.set(key, u);
              });
              remoteUsers.forEach((u) => {
                const key = u.phone || u.uid;
                if (!activeDel.has(u.phone) && !activeDel.has(key)) map.set(key, u);
              });
              map.set(MASTER_OWNER_PHONE, {
                ...INITIAL_REGISTERED_USERS[0],
                status: 'active',
                canPublish: true,
                publishingRequestStatus: 'approved'
              });
              return Array.from(map.values()).sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
            });
          }
        },
        (err) => {
          console.warn('AdminPanel users onSnapshot notice:', err);
        }
      );
    } catch (err) {
      console.warn('Could not establish AdminPanel users listener:', err);
    }

    // 3. مستمع Firestore لطلبات المعاينة مع رصد docChanges()
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

          const isInitial = !isBookingsInitializedRef.current;
          snapshot.docChanges().forEach((change) => {
            const bookingData = change.doc.data() as BookingRequest;
            const docId = change.doc.id;

            if (change.type === 'added') {
              if (isInitial) {
                knownBookingIdsRef.current.add(docId);
              } else if (!knownBookingIdsRef.current.has(docId)) {
                // طلب معاينة جديد يظهر للمرة الأولى للمالك!
                knownBookingIdsRef.current.add(docId);
                setNewlyArrivedIds((prev) => new Set([...prev, docId]));
                playAlertChime();
                onShowToast(
                  `📅 طلب معاينة جديد ورد للمرة الأولى: لعقار "${bookingData.propertyTitle}" من (${bookingData.clientName})`,
                  'info'
                );
              }
            }
          });

          isBookingsInitializedRef.current = true;
          if (remoteBookings.length > 0) {
            setLiveStreamedBookings((prev) => {
              const map = new Map<string, BookingRequest>();
              (bookings || []).forEach((b) => { if (b && b.id) map.set(b.id, b); });
              (prev || []).forEach((b) => { if (b && b.id) map.set(b.id, b); });
              remoteBookings.forEach((b) => { if (b && b.id) map.set(b.id, b); });
              return Array.from(map.values()).sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
            });
          }
        },
        (err) => {
          console.warn('AdminPanel bookings onSnapshot notice:', err);
        }
      );
    } catch (err) {
      console.warn('Could not establish AdminPanel bookings listener:', err);
    }

    // 4. مستمع التزامن السحابي الحقيقي (SSE) لربط مختلف عناوين الـ IP والأجهزة لحظياً
    const unsubSse = addSyncEventListener((event) => {
      if (event.type === 'user_registered' && event.data?.user) {
        const u = event.data.user;
        const uid = u.uid || u.phone;
        if (!knownUserIdsRef.current.has(uid)) {
          knownUserIdsRef.current.add(uid);
          if (u.phone) knownUserIdsRef.current.add(u.phone);
          setNewlyArrivedIds((prev) => new Set([...prev, uid, u.phone]));
          playAlertChime();
          onShowToast(`👤 مستخدم جديد ينضم للمرة الأولى: "${u.name || u.phone}"`, 'info');
        }
        setLiveStreamedUsers((prev) => [u, ...(prev || users).filter((item) => item.uid !== u.uid && item.phone !== u.phone)]);
      } else if (event.type === 'property_added' && event.data?.property) {
        const p = event.data.property;
        if (!knownPropIdsRef.current.has(p.id)) {
          knownPropIdsRef.current.add(p.id);
          setNewlyArrivedIds((prev) => new Set([...prev, p.id]));
          playAlertChime();
          onShowToast(`🔔 عقار جديد يظهر للمرة الأولى: "${p.title}"`, p.status === 'pending' ? 'info' : 'success');
        }
        setLiveStreamedProps((prev) => [p, ...(prev || properties).filter((item) => item.id !== p.id)]);
      } else if (event.type === 'booking_added' && event.data?.booking) {
        const b = event.data.booking;
        if (!knownBookingIdsRef.current.has(b.id)) {
          knownBookingIdsRef.current.add(b.id);
          setNewlyArrivedIds((prev) => new Set([...prev, b.id]));
          playAlertChime();
          onShowToast(`📅 طلب معاينة جديد ورد للتو: لعقار "${b.propertyTitle}"`, 'info');
        }
        setLiveStreamedBookings((prev) => [b, ...(prev || bookings).filter((item) => item.id !== b.id)]);
      }
    });

    // 5. مستمع محلي إضافي
    const handleLocalUserRegistered = (e: any) => {
      if (e.detail) {
        const u = e.detail;
        const uid = u.uid || u.phone;
        if (!knownUserIdsRef.current.has(uid)) {
          knownUserIdsRef.current.add(uid);
          if (u.phone) knownUserIdsRef.current.add(u.phone);
          setNewlyArrivedIds((prev) => new Set([...prev, uid, u.phone]));
        }
        setLiveStreamedUsers((prev) => {
          const base = prev || users;
          const filtered = base.filter((item) => item.uid !== u.uid && item.phone !== u.phone);
          return [u, ...filtered];
        });
      }
    };
    window.addEventListener('sakan_user_registered', handleLocalUserRegistered);

    return () => {
      unsubProps();
      unsubUsers();
      unsubBookings();
      unsubSse();
      window.removeEventListener('sakan_user_registered', handleLocalUserRegistered);
    };
  }, [users, properties, bookings, onShowToast, playAlertChime]);

  // 1. Compute effective users list with comprehensive union across all sources (prop, liveStream, local, registered)
  const effectiveUsers = useMemo(() => {
    const activeDel = getDeletedUserPhones();
    const map = new Map<string, UserProfile>();

    // Initial registered users
    INITIAL_REGISTERED_USERS.forEach((u) => {
      const key = u.phone || u.uid;
      if (!activeDel.has(u.phone) && !locallyDeletedUserIds.has(u.uid) && !locallyDeletedUserIds.has(u.phone)) {
        map.set(key, u);
      }
    });

    // Local storage saved directory
    try {
      const localSaved = localStorage.getItem('sakan_all_registered_users');
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: UserProfile) => {
            const key = u.phone || u.uid;
            if (key && !activeDel.has(u.phone) && !locallyDeletedUserIds.has(u.uid) && !locallyDeletedUserIds.has(u.phone)) {
              map.set(key, u);
            }
          });
        }
      }
    } catch {}

    // Registered accounts store
    try {
      const accounts = getRegisteredAccounts();
      Object.values(accounts).forEach((acc) => {
        if (acc && acc.profile) {
          const u = acc.profile;
          const key = u.phone || u.uid;
          if (key && !activeDel.has(u.phone) && !locallyDeletedUserIds.has(u.uid) && !locallyDeletedUserIds.has(u.phone)) {
            map.set(key, u);
          }
        }
      });
    } catch {}

    // Base users passed from parent App.tsx
    (users || []).forEach((u) => {
      const key = u.phone || u.uid;
      if (key && !activeDel.has(u.phone) && !locallyDeletedUserIds.has(u.uid) && !locallyDeletedUserIds.has(u.phone)) {
        map.set(key, u);
      }
    });

    // Live streamed users from Firestore snapshot
    (liveStreamedUsers || []).forEach((u) => {
      const key = u.phone || u.uid;
      if (key && !activeDel.has(u.phone) && !locallyDeletedUserIds.has(u.uid) && !locallyDeletedUserIds.has(u.phone)) {
        map.set(key, u);
      }
    });

    // Locally added users in current session
    (locallyAddedUsers || []).forEach((u) => {
      const key = u.phone || u.uid;
      if (key && !activeDel.has(u.phone) && !locallyDeletedUserIds.has(u.uid) && !locallyDeletedUserIds.has(u.phone)) {
        map.set(key, u);
      }
    });

    // Apply permission overrides and ensure Master Owner immunity
    const result: UserProfile[] = [];
    map.forEach((u) => {
      const override = userPermissionOverrides[u.uid] || (u.phone ? userPermissionOverrides[u.phone] : undefined);
      let userObj = override ? {
        ...u,
        canPublish: override.canPublish,
        publishingRequestStatus: override.publishingRequestStatus
      } : u;

      if (u.phone === MASTER_OWNER_PHONE || u.uid === 'owner-master') {
        userObj = {
          ...userObj,
          role: 'admin',
          status: 'active',
          canPublish: true,
          publishingRequestStatus: 'approved'
        };
      }
      result.push(userObj);
    });

    return result.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }, [users, liveStreamedUsers, locallyAddedUsers, locallyDeletedUserIds, userPermissionOverrides]);

  // 2. Compute effective properties list with union across prop, live stream, and local storage
  const effectiveProperties = useMemo(() => {
    const map = new Map<string, Property>();

    // Local cached properties
    try {
      const localPropsSaved = localStorage.getItem('sakan_local_properties');
      if (localPropsSaved) {
        const parsed = JSON.parse(localPropsSaved);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: Property) => {
            if (p && p.id && !deletedPropertyIds.has(p.id)) map.set(p.id, p);
          });
        }
      }
    } catch {}

    // Base properties from App.tsx
    (properties || []).forEach((p) => {
      if (p && p.id && !deletedPropertyIds.has(p.id)) {
        map.set(p.id, p);
      }
    });

    // Live streamed properties from Firestore snapshot
    (liveStreamedProps || []).forEach((p) => {
      if (p && p.id && !deletedPropertyIds.has(p.id)) {
        map.set(p.id, p);
      }
    });

    return Array.from(map.values())
      .map((p) => {
        const statusOverride = propertyStatusOverrides[p.id];
        const featuredOverride = propertyFeaturedOverrides[p.id];
        return {
          ...p,
          status: statusOverride !== undefined ? statusOverride : p.status,
          featured: featuredOverride !== undefined ? featuredOverride : p.featured
        };
      })
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }, [properties, liveStreamedProps, deletedPropertyIds, propertyStatusOverrides, propertyFeaturedOverrides]);

  // 3. Memoized High-Speed Core Statistics
  const stats = useMemo(() => {
    const pendingPropertiesCount = effectiveProperties.filter((p) => p.status === 'pending').length;
    const activeUsersCount = effectiveUsers.filter((u) => u.status === 'active').length;
    const pendingPublishRequestsCount = effectiveUsers.filter((u) => u.publishingRequestStatus === 'pending').length;
    const newRequestsPendingApprovalCount = pendingPublishRequestsCount + pendingPropertiesCount;
    const totalSale = effectiveProperties.filter((p) => p.type === 'sale').length;
    const totalRent = effectiveProperties.filter((p) => p.type === 'rent').length;
    const totalAuthorizedPublishers = effectiveUsers.filter((u) => u.canPublish).length;

    return {
      pendingPropertiesCount,
      activeUsersCount,
      pendingPublishRequestsCount,
      newRequestsPendingApprovalCount,
      totalSale,
      totalRent,
      totalAuthorizedPublishers
    };
  }, [effectiveProperties, effectiveUsers]);

  // 4. Memoized Filtered Properties
  const filteredProperties = useMemo(() => {
    const term = propSearchTerm.trim().toLowerCase();
    return effectiveProperties.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSearch =
        !term ||
        p.title.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term) ||
        (p.ownerName && p.ownerName.toLowerCase().includes(term)) ||
        (p.contactPhone && p.contactPhone.includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [effectiveProperties, statusFilter, propSearchTerm]);

  // 5. Memoized Filtered Users
  const filteredUsers = useMemo(() => {
    const rawTerm = userSearchTerm.trim().toLowerCase();
    const cleanTerm = rawTerm.replace(/[^0-9]/g, '');
    return effectiveUsers.filter((u) => {
      const matchesRole =
        userRoleFilter === 'all' ||
        (userRoleFilter === 'pending_request' ? u.publishingRequestStatus === 'pending' : u.role === userRoleFilter);
      const matchesSearch =
        !rawTerm ||
        (u.name && u.name.toLowerCase().includes(rawTerm)) ||
        (u.phone && u.phone.includes(rawTerm)) ||
        (cleanTerm.length >= 3 && u.phone && u.phone.replace(/[^0-9]/g, '').includes(cleanTerm)) ||
        (u.email && u.email.toLowerCase().includes(rawTerm));
      return matchesRole && matchesSearch;
    });
  }, [effectiveUsers, userRoleFilter, userSearchTerm]);

  // 6. Memoized Filtered Bookings (with live streamed Firestore bookings)
  const effectiveBookings = useMemo(() => {
    return liveStreamedBookings || bookings;
  }, [liveStreamedBookings, bookings]);

  const filteredBookings = useMemo(() => {
    const term = bookingSearchTerm.trim().toLowerCase();
    return effectiveBookings.filter((b) => {
      return (
        !term ||
        b.propertyTitle.toLowerCase().includes(term) ||
        b.clientName.toLowerCase().includes(term) ||
        b.clientPhone.includes(term) ||
        (b.notes && b.notes.toLowerCase().includes(term))
      );
    });
  }, [effectiveBookings, bookingSearchTerm]);

  // 7. Memoized Admin Notifications & Unread count
  const unreadNotificationsCount = useMemo(() => {
    return adminNotifications.filter((n) => !n.read).length;
  }, [adminNotifications]);

  const filteredAdminNotifications = useMemo(() => {
    const term = notifSearchTerm.trim().toLowerCase();
    return adminNotifications.filter((n) => {
      const matchesType = notifTypeFilter === 'all' || n.type === notifTypeFilter;
      const matchesSearch =
        !term ||
        n.title.toLowerCase().includes(term) ||
        n.message.toLowerCase().includes(term) ||
        (n.userName && n.userName.toLowerCase().includes(term)) ||
        (n.userPhone && n.userPhone.includes(term)) ||
        (n.propertyTitle && n.propertyTitle.toLowerCase().includes(term));
      return matchesType && matchesSearch;
    });
  }, [adminNotifications, notifTypeFilter, notifSearchTerm]);

  // Action Handlers with Instant Optimistic Visual Updates
  const handleTogglePublishWithOptimism = useCallback(
    (uid: string, currentPermission: boolean, userName: string) => {
      const newPermission = !currentPermission;
      const requestStatus = newPermission ? 'approved' : 'none';

      // 1. Instant 0ms local state update
      setUserPermissionOverrides((prev) => ({
        ...prev,
        [uid]: { canPublish: newPermission, publishingRequestStatus: requestStatus }
      }));

      // 2. Visual Toast
      onShowToast(
        newPermission
          ? `تمت الموافقة الفورية ومنح صلاحية النشر للمستخدم (${userName})`
          : `تم سحب صلاحيات النشر عن المستخدم (${userName})`,
        newPermission ? 'success' : 'info'
      );

      // 3. Delegate to async background persistence
      onToggleUserPublishPermission(uid, currentPermission);
    },
    [onToggleUserPublishPermission, onShowToast]
  );

  const handleUpdateStatusWithOptimism = useCallback(
    (id: string, newStatus: 'active' | 'pending' | 'sold', title: string) => {
      setPropertyStatusOverrides((prev) => ({ ...prev, [id]: newStatus }));

      onShowToast(
        newStatus === 'active'
          ? `تم اعتماد ونشر عقار "${title}" فوراً في المنصة`
          : `تم تحديث حالة عقار "${title}" إلى "${newStatus === 'sold' ? 'تم التعاقد' : 'معلق'}"`,
        newStatus === 'active' ? 'success' : 'info'
      );

      onUpdatePropertyStatus(id, newStatus);
    },
    [onUpdatePropertyStatus, onShowToast]
  );

  const handleToggleFeaturedWithOptimism = useCallback(
    (id: string, currentFeatured: boolean) => {
      const next = !currentFeatured;
      setPropertyFeaturedOverrides((prev) => ({ ...prev, [id]: next }));

      onShowToast(next ? 'تم تمييز العقار على الصفحة الرئيسية' : 'تم إلغاء التمييز', 'info');
      onToggleFeatured(id);
    },
    [onToggleFeatured, onShowToast]
  );

  const handleDeletePropertyWithOptimism = useCallback(
    (id: string, title: string) => {
      if (!confirm(`هل أنت متأكد من حذف عقار "${title}" نهائياً؟`)) return;

      setDeletedPropertyIds((prev) => new Set([...prev, id]));
      onShowToast(`تم حذف عقار "${title}" بنجاح`, 'info');
      onDeleteProperty(id);
    },
    [onDeleteProperty, onShowToast]
  );

  // Handle Creating New User Account (with role, credentials, and limited/full permissions)
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    const clean = newUserPhone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 9) {
      setAddUserError('يرجى إدخال رقم هاتف صحيح مكون من 10 أو 11 رقم');
      return;
    }

    if (clean === MASTER_OWNER_PHONE) {
      setAddUserError('هذا الرقم مخصص حصرياً للمالك الأساسي للمنصة');
      return;
    }

    setIsSubmittingUser(true);
    try {
      if (onAddUserAccount) {
        const res = await onAddUserAccount({
          name: newUserName.trim() || 'مستخدم جديد',
          phone: clean,
          password: newUserPassword.trim() || '123456',
          role: newUserRole,
          canPublish: newUserCanPublish,
          status: newUserStatus
        });

        if (!res.success) {
          setAddUserError(res.error || 'فشل إضافة الحساب');
          setIsSubmittingUser(false);
          return;
        }

        if (res.profile) {
          setLocallyAddedUsers((prev) => [res.profile!, ...prev]);
        }
      }

      const now = setLastAdminEditTime();
      setLastAdminEditTimeState(now);
      setIsAddUserModalOpen(false);
      onShowToast(`تمت إضافة الحساب بنجاح (${newUserName || clean}) مع حفظ كافة التعديلات`, 'success');

      // Reset form fields
      setNewUserName('');
      setNewUserPhone('');
      setNewUserPassword('');
      setNewUserRole('client');
      setNewUserCanPublish(false);
      setNewUserStatus('active');
    } catch (err: any) {
      setAddUserError(err.message || 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Handle Deleting User Account (Guaranteed: Master Owner phone is protected)
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.phone === MASTER_OWNER_PHONE || isMasterAdmin(userToDelete.phone)) {
      onShowToast('لا يمكن حذف حساب المالك الأساسي للمنصة نهائياً!', 'error');
      setUserToDelete(null);
      return;
    }

    setIsDeletingUser(true);
    try {
      if (onDeleteUserAccount) {
        const res = await onDeleteUserAccount(userToDelete.uid, userToDelete.phone);
        if (!res.success) {
          onShowToast(res.error || 'فشل حذف الحساب', 'error');
          setIsDeletingUser(false);
          return;
        }
      }

      setLocallyDeletedUserIds((prev) => new Set([...prev, userToDelete.uid, userToDelete.phone]));
      const now = setLastAdminEditTime();
      setLastAdminEditTimeState(now);
      onShowToast(`تم حذف حساب (${userToDelete.name || userToDelete.phone}) بنجاح وتم الاحتفاظ بآخر تعديل`, 'info');
      setUserToDelete(null);
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ غير متوقع أثناء الحذف', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Formatted last sync time
  const formattedSyncTime = useMemo(() => {
    if (!lastSyncTime) return 'الآن';
    const date = new Date(lastSyncTime);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [lastSyncTime]);

  // Formatted last admin edit timestamp
  const formattedLastEditTime = useMemo(() => {
    if (!lastAdminEditTime) return 'محفوظ الآن';
    const date = new Date(lastAdminEditTime);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' }) + ')';
  }, [lastAdminEditTime]);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col my-auto relative scroll-smooth">
        
        {/* Header with Fast Live-Sync Bar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md font-black shrink-0">
              <Crown className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 text-lg">لوحة تحكم المالك الأساسي</h3>
                <span className="bg-amber-100 text-amber-950 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-300 font-mono">
                  {MASTER_OWNER_PHONE}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                إدارة المستخدمين والعملاء النشطين، منح صلاحيات النشر، واعتماد إعلانات العقارات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Analytics Charts Toggle Button */}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 active:scale-95 shadow-xs ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-emerald-700/20 ring-2 ring-emerald-400'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
              title="عرض إحصائيات العقارات النشطة والمبيعات الشهرية بيانياً"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>الرسوم البيانية</span>
            </button>

            {/* Real-time Query / Manual Refresh Button */}
            {onRefreshData && (
              <button
                type="button"
                disabled={isRefreshing}
                onClick={onRefreshData}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200 active:scale-95 disabled:opacity-60"
                title="مزامنة فورية وتحديث البيانات من Firebase"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'جاري المزامنة...' : 'تحديث واستعلام سريع'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="إغلاق لوحة التحكم"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Quick Statistics Bar - إحصائيات سريعة للوحة التحكم */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>إحصائيات سريعة ومؤشرات فورية للوحة التحكم:</span>
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs" title="يتم الاحتفاظ بجميع التعديلات والحسابات والصلاحيات بصورة دائمة وفورية">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>تم حفظ واستبقاء آخر تعديل:</span>
                <span className="font-mono text-emerald-950 font-black">{formattedLastEditTime}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>مزامنة Firebase • {formattedSyncTime}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. عدد العقارات المعلقة */}
            <div
              onClick={() => {
                setActiveTab('properties');
                setStatusFilter('pending');
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                stats.pendingPropertiesCount > 0
                  ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/80 hover:bg-amber-100/70'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Clock className={`w-4 h-4 ${stats.pendingPropertiesCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>العقارات المعلقة</span>
                </span>
                {stats.pendingPropertiesCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    تنتظر الاعتماد
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {stats.pendingPropertiesCount}
                </span>
                <span className="text-xs font-bold text-slate-500">عقار معلق</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {stats.pendingPropertiesCount > 0
                  ? 'عقارات بانتظار موافقة واعتماد المالك'
                  : 'لا توجد عقارات معلقة حالياً'}
              </p>
            </div>

            {/* 2. عدد المستخدمين النشطين */}
            <div
              onClick={() => {
                setActiveTab('users');
                setUserRoleFilter('all');
              }}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-xs hover:shadow-md hover:bg-slate-50"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>المستخدمين النشطين</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  حسابات نشطة
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700 font-mono">
                  {stats.activeUsersCount}
                </span>
                <span className="text-xs font-bold text-slate-500">مستخدم نشط</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                من إجمالي {effectiveUsers.length} مستخدم مسجل بالمنصة
              </p>
            </div>

            {/* 3. عدد الطلبات الجديدة التي تنتظر الموافقة */}
            <div
              onClick={() => {
                if (stats.pendingPublishRequestsCount > 0) {
                  setActiveTab('users');
                  setUserRoleFilter('pending_request');
                } else {
                  setActiveTab('properties');
                  setStatusFilter('pending');
                }
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                stats.newRequestsPendingApprovalCount > 0
                  ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-300/80 hover:bg-rose-100/70'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert className={`w-4 h-4 ${stats.newRequestsPendingApprovalCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>طلبات تنتظر الموافقة</span>
                </span>
                {stats.newRequestsPendingApprovalCount > 0 ? (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    مطلوب إجراء
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    مكتمل ✓
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-700 font-mono">
                  {stats.newRequestsPendingApprovalCount}
                </span>
                <span className="text-xs font-bold text-slate-500">طلب جديد</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 font-medium">
                {stats.pendingPublishRequestsCount} طلبات نشر + {stats.pendingPropertiesCount} عقارات بانتظار الاعتماد
              </p>
            </div>

            {/* 4. طلبات المعاينة الواردة */}
            <div
              onClick={() => setActiveTab('bookings')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-xs hover:shadow-md hover:bg-slate-50"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-900" />
                  <span>طلبات المعاينة</span>
                </span>
                <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {effectiveBookings.length} وارد
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-950 font-mono">
                  {effectiveBookings.length}
                </span>
                <span className="text-xs font-bold text-slate-500">طلب معاينة</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                حجوزات زيارة وتفقد العقارات من العملاء
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons with instant counter badges */}
        <div className="px-6 pt-4 flex items-center justify-between gap-4 border-b border-slate-100 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Users Tab */}
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-3 text-sm font-black border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'users'
                  ? 'border-blue-950 text-blue-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>المستخدمين والعملاء ({effectiveUsers.length})</span>
              {stats.pendingPublishRequestsCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.2 rounded-full">
                  {stats.pendingPublishRequestsCount} طلب نشر
                </span>
              )}
            </button>

            {/* Properties Tab */}
            <button
              onClick={() => setActiveTab('properties')}
              className={`pb-3 px-3 text-sm font-black border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'properties'
                  ? 'border-blue-950 text-blue-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>إدارة العقارات ({effectiveProperties.length})</span>
              {stats.pendingPropertiesCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.2 rounded-full">
                  {stats.pendingPropertiesCount} معلق
                </span>
              )}
            </button>

            {/* Bookings Tab */}
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-3 px-3 text-sm font-black border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'bookings'
                  ? 'border-blue-950 text-blue-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>طلبات المعاينة ({effectiveBookings.length})</span>
            </button>

            {/* Admin Notifications Tab */}
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 px-3 text-sm font-black border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'notifications'
                  ? 'border-blue-950 text-blue-950'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Bell className="w-4 h-4 text-amber-500" />
              <span>الإشعارات الإدارية ({adminNotifications.length})</span>
              {unreadNotificationsCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {unreadNotificationsCount} جديد
                </span>
              )}
            </button>

            {/* Analytics & Charts Tab */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 px-3 text-sm font-black border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>الرسوم البيانية والتحليلات</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          
          {/* USERS & CLIENTS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filter controls & Add User button */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="ابحث بالاسم، الهاتف، البريد..."
                      className="w-full pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                    {userSearchTerm && (
                      <button
                        onClick={() => setUserSearchTerm('')}
                        className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Add New User Account Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddUserError(null);
                      setNewUserName('');
                      setNewUserPhone('');
                      setNewUserPassword('123456');
                      setNewUserRole('client');
                      setNewUserCanPublish(false);
                      setNewUserStatus('active');
                      setIsAddUserModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm shrink-0"
                    title="إضافة حساب جديد (مالك، عميل، بائع، مؤجر) مع تخصيص الصلاحيات"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ إضافة حساب جديد</span>
                  </button>
                </div>

                {/* Quick Role Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      userRoleFilter === 'all'
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    الكل ({effectiveUsers.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('pending_request')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      userRoleFilter === 'pending_request'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200/70 border border-amber-300/80'
                    }`}
                  >
                    <span>طلبات النشر</span>
                    <span className="bg-white/80 px-1.5 rounded-full text-[10px] font-mono">
                      {stats.pendingPublishRequestsCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('client')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      userRoleFilter === 'client'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    العملاء
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('owner')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      userRoleFilter === 'owner'
                        ? 'bg-blue-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    الملاك
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRoleFilter('renter')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      userRoleFilter === 'renter'
                        ? 'bg-purple-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    المؤجرين / البائعين
                  </button>
                </div>
              </div>

              {/* Counter status label */}
              <div className="text-[11px] text-slate-500 font-bold px-1 flex items-center justify-between">
                <span>تم العثور على {filteredUsers.length} مستخدم مطابق</span>
                {filteredUsers.length > userLimit && (
                  <span>عرض {userLimit} من {filteredUsers.length}</span>
                )}
              </div>

              {/* Users List */}
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-slate-100">
                    لا يوجد مستخدمون مطابقون لمعايير البحث.
                  </div>
                ) : (
                  filteredUsers.slice(0, userLimit).map((u) => {
                    const isMaster = u.phone === MASTER_OWNER_PHONE || isMasterAdmin(u.phone);
                    const isPendingApproval = u.publishingRequestStatus === 'pending';
                    const isNewlyArrived = newlyArrivedIds.has(u.uid) || (u.phone && newlyArrivedIds.has(u.phone));

                    return (
                      <div
                        key={u.uid}
                        className={`p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                          isNewlyArrived
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500 shadow-md animate-in fade-in duration-300'
                            : isMaster
                            ? 'bg-amber-50/70 border-amber-200'
                            : isPendingApproval
                            ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* User Basic Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm ${
                            isMaster
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                              : u.role === 'client'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.role === 'owner'
                              ? 'bg-blue-100 text-blue-900'
                              : u.role === 'renter'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            {isMaster ? <Crown className="w-6 h-6" /> : u.name?.charAt(0) || <Users className="w-5 h-5" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-black text-slate-900 text-sm">{u.name || 'مستخدم بدون اسم'}</h4>

                              {/* Newly Arrived Highlight Badge */}
                              {isNewlyArrived && (
                                <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                                  <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                                  سجل جديد للمرة الأولى
                                </span>
                              )}

                              {/* Role Badge */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isMaster
                                  ? 'bg-amber-400 text-amber-950 font-black'
                                  : u.role === 'client'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : u.role === 'owner'
                                  ? 'bg-blue-100 text-blue-800'
                                  : u.role === 'renter'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {isMaster
                                  ? 'المالك الأساسي'
                                  : u.role === 'client'
                                  ? 'عميل نشط'
                                  : u.role === 'owner'
                                  ? 'مالك عقارات'
                                  : u.role === 'renter'
                                  ? 'بائع / مؤجر'
                                  : 'مسؤول إداري'}
                              </span>

                              {/* Active Status */}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {u.status === 'active' ? '● نشط' : 'معلق'}
                              </span>
                            </div>

                            {/* Phone & Date */}
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              <span className="font-mono font-bold text-slate-700">{u.phone}</span>
                              {u.createdAt && (
                                <span>مسجل منذ: {new Date(u.createdAt).toLocaleDateString('ar-EG')}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Publishing Permissions & Controls */}
                        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 flex-wrap">
                          {/* Publishing Status Indicator */}
                          {isMaster ? (
                            <span className="px-3 py-1.5 bg-amber-200 text-amber-950 rounded-xl text-xs font-black flex items-center gap-1 border border-amber-300">
                              <Crown className="w-3.5 h-3.5" />
                              صلاحية النشر دائمة
                            </span>
                          ) : u.canPublish ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              مصرح له بالنشر
                            </span>
                          ) : isPendingApproval ? (
                            <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-black flex items-center gap-1 border border-amber-300 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              في انتظار موافقة المالك للنشر
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                              النشر محجوب (صلاحيات محدودة)
                            </span>
                          )}

                          {/* Owner Action: Grant / Revoke Publish Permission */}
                          {!isMaster && (
                            <button
                              type="button"
                              onClick={() => handleTogglePublishWithOptimism(u.uid, !!u.canPublish, u.name || u.phone)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1.5 active:scale-95 ${
                                u.canPublish
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {u.canPublish ? (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>سحب صلاحية النشر</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>منح صلاحية النشر</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Master Protection Badge vs Delete Button */}
                          {isMaster ? (
                            <span
                              className="px-2.5 py-1.5 bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs"
                              title="حساب المالك الأساسي محمي ضد الحذف ولا يمكن حذفه إطلاقاً"
                            >
                              <ShieldCheck className="w-4 h-4 text-amber-600" />
                              <span>محمي ضد الحذف</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition border border-rose-200 active:scale-95"
                              title={`حذف حساب ${u.name || u.phone} نهائياً من المنصة`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Direct WhatsApp Chat with User */}
                          <a
                            href={`https://wa.me/2${u.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `مرحباً أستاذ ${u.name || ''}، معك إدارة منصة سكن بلس (01007775402)`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition"
                            title="محادثة واتساب"
                          >
                            <MessageCircle className="w-4 h-4 fill-current" />
                          </a>

                          {/* Direct Phone Call */}
                          <a
                            href={`tel:${u.phone}`}
                            className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Show more users button */}
              {filteredUsers.length > userLimit && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setUserLimit((prev) => prev + 25)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
                  >
                    عرض المزيد من المستخدمين (+25)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PROPERTIES TAB */}
          {activeTab === 'properties' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="بحث في عنوان، موقع، أو هاتف المعلن..."
                    value={propSearchTerm}
                    onChange={(e) => setPropSearchTerm(e.target.value)}
                    className="px-3.5 pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none w-full focus:ring-2 focus:ring-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  {propSearchTerm && (
                    <button
                      onClick={() => setPropSearchTerm('')}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick Status Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      statusFilter === 'all'
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    كافة الحالات ({effectiveProperties.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      statusFilter === 'pending'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200/70 border border-amber-300/80'
                    }`}
                  >
                    <span>المعلقة</span>
                    <span className="bg-white/80 px-1.5 rounded-full text-[10px] font-mono">
                      {stats.pendingPropertiesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      statusFilter === 'active'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    النشطة والمعتمدة
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('sold')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      statusFilter === 'sold'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    المباع / المؤجر
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1 shadow-xs"
                    title="عرض إحصائيات العقارات النشطة والمبيعات بيانياً"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>عرض الرسوم البيانية</span>
                  </button>
                </div>
              </div>

              {/* Counter status label */}
              <div className="text-[11px] text-slate-500 font-bold px-1 flex items-center justify-between">
                <span>تم العثور على {filteredProperties.length} عقار مطابق</span>
                {filteredProperties.length > propLimit && (
                  <span>عرض {propLimit} من {filteredProperties.length}</span>
                )}
              </div>

              <div className="space-y-3">
                {filteredProperties.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-slate-100">
                    لا توجد عقارات مطابقة للفلاتر المحددة.
                  </div>
                ) : (
                  filteredProperties.slice(0, propLimit).map((prop) => {
                    const isNewlyArrived = newlyArrivedIds.has(prop.id);
                    return (
                    <div
                      key={prop.id}
                      className={`p-4 rounded-2xl border transition shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isNewlyArrived
                          ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500 shadow-md animate-in fade-in duration-300'
                          : prop.status === 'pending'
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-300'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={prop.images[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=300&q=80'}
                          alt=""
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {isNewlyArrived && (
                              <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse shadow-xs">
                                <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                                عقار جديد للمرة الأولى
                              </span>
                            )}
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              prop.type === 'rent' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {prop.type === 'rent' ? 'للإيجار' : 'للبيع'}
                            </span>
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                              {prop.category}
                            </span>
                            {prop.status === 'pending' && (
                              <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                يتطلب موافقة المالك للنشر
                              </span>
                            )}
                            {prop.status === 'active' && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" /> نشط ومعتمد
                              </span>
                            )}
                            {prop.status === 'sold' && (
                              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                تم التعاقد
                              </span>
                            )}
                            {prop.featured && (
                              <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                                مميز ★
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-slate-900 text-sm truncate">{prop.title}</h4>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {prop.location} • <span className="font-bold text-slate-700 font-mono">{Number(prop.price).toLocaleString()} ج.م</span> • المعلن: {prop.ownerName || prop.contactPhone}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                        <button
                          onClick={() => onSelectProperty(prop)}
                          className="p-2 text-slate-600 hover:text-blue-950 hover:bg-slate-200 rounded-xl transition"
                          title="معاينة الإعلان"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleFeaturedWithOptimism(prop.id, !!prop.featured)}
                          className={`p-2 rounded-xl transition ${
                            prop.featured ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                          }`}
                          title="تمييز الإعلان"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>

                        {prop.status !== 'active' ? (
                          <button
                            onClick={() => handleUpdateStatusWithOptimism(prop.id, 'active', prop.title)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>موافقة ونشر العقار</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatusWithOptimism(prop.id, 'sold', prop.title)}
                            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
                          >
                            تم التعاقد
                          </button>
                        )}

                        <button
                          onClick={() => handleDeletePropertyWithOptimism(prop.id, prop.title)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                          title="حذف الإعلان"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              </div>

              {/* Show more properties button */}
              {filteredProperties.length > propLimit && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setPropLimit((prev) => prev + 25)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
                  >
                    عرض المزيد من العقارات (+25)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="بحث في طلبات المعاينة بالاسم، العقار، الهاتف..."
                    value={bookingSearchTerm}
                    onChange={(e) => setBookingSearchTerm(e.target.value)}
                    className="px-3.5 pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none w-full focus:ring-2 focus:ring-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  {bookingSearchTerm && (
                    <button
                      onClick={() => setBookingSearchTerm('')}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-xs text-slate-500 font-bold shrink-0">
                  إجمالي الطلبات: {effectiveBookings.length}
                </span>
              </div>

              <div className="space-y-3">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-slate-100">
                    لا توجد طلبات معاينة واردة مطابقة.
                  </div>
                ) : (
                  filteredBookings.slice(0, bookingLimit).map((booking) => {
                    const isNewlyArrived = newlyArrivedIds.has(String(booking.id)) || newlyArrivedIds.has(booking.id);
                    return (
                      <div
                        key={booking.id}
                        className={`p-4 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300 ${
                          isNewlyArrived
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400 shadow-md animate-pulse'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {isNewlyArrived ? (
                              <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                <Sparkles className="w-3 h-3 text-amber-300 fill-current" />
                                <span>طلب معاينة جديد ورد للتو!</span>
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                طلب معاينة جديد
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-mono">
                              {new Date(booking.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-900 text-sm">عقار: {booking.propertyTitle}</h4>
                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-3">
                            <span>العميل: <strong>{booking.clientName}</strong></span>
                            <span>الهاتف: <strong className="font-mono">{booking.clientPhone}</strong></span>
                            <span>الموعد المطلوب: <strong className="text-amber-700">{booking.date}</strong></span>
                          </div>
                          {booking.notes && (
                            <p className="text-xs text-slate-500 mt-1.5 italic bg-white p-2 rounded-lg border border-slate-100">
                              ملاحظات العميل: "{booking.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`https://wa.me/2${booking.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `مرحباً أستاذ ${booking.clientName}، بخصوص طلب معاينتك لعقار "${booking.propertyTitle}" عبر سكن بلس`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>محادثة واتساب</span>
                          </a>
                          <a
                            href={`tel:${booking.clientPhone}`}
                            className="p-2 bg-blue-950 hover:bg-blue-900 text-white rounded-xl transition"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {filteredBookings.length > bookingLimit && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setBookingLimit((prev) => prev + 25)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
                  >
                    عرض المزيد من طلبات المعاينة (+25)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ADMIN NOTIFICATIONS & ALERTS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {/* Header Filters & Controls */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="بحث في الإشعارات، الأسماء، الهواتف، أو العقارات..."
                    value={notifSearchTerm}
                    onChange={(e) => setNotifSearchTerm(e.target.value)}
                    className="px-3.5 pl-8 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none w-full focus:ring-2 focus:ring-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  {notifSearchTerm && (
                    <button
                      onClick={() => setNotifSearchTerm('')}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkAllAdminNotificationsRead();
                        onShowToast('تم تحديد كافة الإشعارات كمقروءة', 'info');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تحديد الكل كمقروء</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-500 font-bold">
                    إجمالي: {adminNotifications.length}
                  </span>
                </div>
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setNotifTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    notifTypeFilter === 'all'
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  جميع الإشعارات ({adminNotifications.length})
                </button>

                <button
                  type="button"
                  onClick={() => setNotifTypeFilter('new_user')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    notifTypeFilter === 'new_user'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تسجيل مستخدمين ({adminNotifications.filter((n) => n.type === 'new_user').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifTypeFilter('new_property')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    notifTypeFilter === 'new_property'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>عقارات جديدة ({adminNotifications.filter((n) => n.type === 'new_property').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifTypeFilter('publish_request')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    notifTypeFilter === 'publish_request'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>طلبات نشر ({adminNotifications.filter((n) => n.type === 'publish_request').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifTypeFilter('booking_request')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    notifTypeFilter === 'booking_request'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>حجوزات ({adminNotifications.filter((n) => n.type === 'booking_request').length})</span>
                </button>
              </div>

              {/* Notifications Stream Cards */}
              <div className="space-y-3">
                {filteredAdminNotifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
                    <Bell className="w-8 h-8 text-slate-300" />
                    <span>لا توجد إشعارات تطابق التصفية المحددة حالياً.</span>
                  </div>
                ) : (
                  filteredAdminNotifications.slice(0, notifLimit).map((notif) => {
                    const isNewUser = notif.type === 'new_user';
                    const isNewProp = notif.type === 'new_property';
                    const isPublishReq = notif.type === 'publish_request';
                    const isBooking = notif.type === 'booking_request';

                    return (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xs ${
                          !notif.read
                            ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/60'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200'
                        }`}
                      >
                        {/* Right Content */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          {/* Type Icon Badge */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isNewUser
                                ? 'bg-emerald-100 text-emerald-800'
                                : isNewProp
                                ? 'bg-amber-100 text-amber-800'
                                : isPublishReq
                                ? 'bg-rose-100 text-rose-800'
                                : isBooking
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isNewUser && <Users className="w-5 h-5" />}
                            {isNewProp && <Building2 className="w-5 h-5" />}
                            {isPublishReq && <ShieldAlert className="w-5 h-5" />}
                            {isBooking && <Calendar className="w-5 h-5" />}
                            {!isNewUser && !isNewProp && !isPublishReq && !isBooking && <Bell className="w-5 h-5" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                              )}
                              <h4 className="font-black text-slate-900 text-sm">{notif.title}</h4>
                              <span className="text-[11px] font-semibold text-slate-400">
                                • {formatRelativeTimeArabic(notif.createdAt)}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              {notif.message}
                            </p>

                            {/* Additional metadata tags */}
                            <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px]">
                              {notif.userName && (
                                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                                  الاسم: {notif.userName}
                                </span>
                              )}
                              {notif.userPhone && (
                                <span className="bg-blue-50 text-blue-900 font-mono font-bold px-2 py-0.5 rounded-md">
                                  هاتف: {notif.userPhone}
                                </span>
                              )}
                              {notif.propertyTitle && (
                                <span className="bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded-md truncate max-w-xs">
                                  العقار: {notif.propertyTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Left Action Buttons */}
                        <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
                          {/* Quick Approval for Property */}
                          {isNewProp && notif.propertyId && (
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateStatusWithOptimism(notif.propertyId!, 'active', notif.propertyTitle || 'العقار');
                                onMarkAdminNotificationRead(notif.id);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>اعتماد ونشر العقار</span>
                            </button>
                          )}

                          {/* Quick Approval for User Publishing */}
                          {(isPublishReq || (isNewUser && (notif.userRole === 'owner' || notif.userRole === 'renter'))) && notif.userId && (
                            <button
                              type="button"
                              onClick={() => {
                                handleTogglePublishWithOptimism(notif.userId!, false, notif.userName || notif.userPhone || 'المستخدم');
                                onMarkAdminNotificationRead(notif.id);
                              }}
                              className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs active:scale-95"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>منح ترخيص النشر</span>
                            </button>
                          )}

                          {/* Switch to view in Users list */}
                          {isNewUser && notif.userPhone && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('users');
                                setUserSearchTerm(notif.userPhone!);
                                onMarkAdminNotificationRead(notif.id);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>عرض الحساب</span>
                            </button>
                          )}

                          {/* Mark Read Button */}
                          {!notif.read && (
                            <button
                              type="button"
                              onClick={() => onMarkAdminNotificationRead(notif.id)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="تحديد كمقروء"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Notification */}
                          <button
                            type="button"
                            onClick={() => onDeleteAdminNotification(notif.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="حذف الإشعار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Show more notifications */}
              {filteredAdminNotifications.length > notifLimit && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setNotifLimit((prev) => prev + 25)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
                  >
                    عرض المزيد من الإشعارات (+25)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS & CHARTS TAB */}
          {activeTab === 'analytics' && (
            <AdminAnalyticsCharts
              properties={effectiveProperties}
              bookings={effectiveBookings}
              users={effectiveUsers}
            />
          )}

        </div>

        {/* Modal: إضافة حساب جديد للمنصة مع الصلاحيات */}
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">إضافة حساب جديد للوحة التحكم</h3>
                    <p className="text-[11px] text-slate-500 font-medium">إنشاء حساب جديد وتعيين صلاحيات النشر والوصول</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {addUserError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{addUserError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUserSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم صاحب الحساب</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="مثال: م. أحمد رضوان"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (لتسجيل الدخول)</label>
                    <input
                      type="tel"
                      required
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="010xxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور للحساب</label>
                    <input
                      type="text"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="كلمة المرور"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الحساب / الدور</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserRole('client')}
                      className={`p-2.5 rounded-xl text-xs font-black border text-right transition ${
                        newUserRole === 'client'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span>عميل عادي</span>
                        {newUserRole === 'client' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">تصفح العقارات وحجز المعاينات</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewUserRole('owner')}
                      className={`p-2.5 rounded-xl text-xs font-black border text-right transition ${
                        newUserRole === 'owner'
                          ? 'bg-blue-50 border-blue-500 text-blue-950 ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span>مالك عقارات</span>
                        {newUserRole === 'owner' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">مالك لعقارات ووحدات سكنية</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewUserRole('renter')}
                      className={`p-2.5 rounded-xl text-xs font-black border text-right transition ${
                        newUserRole === 'renter'
                          ? 'bg-purple-50 border-purple-500 text-purple-950 ring-1 ring-purple-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span>بائع / مؤجر</span>
                        {newUserRole === 'renter' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">مسوق أو مؤجر وحدات</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewUserRole('admin')}
                      className={`p-2.5 rounded-xl text-xs font-black border text-right transition ${
                        newUserRole === 'admin'
                          ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span>مشرف إداري</span>
                        {newUserRole === 'admin' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">مساعد إداري باللوحة</span>
                    </button>
                  </div>
                </div>

                {/* Permissions & Publishing Policy */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">مستوى الصلاحيات (صلاحيات النشر)</label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      !newUserCanPublish ? 'bg-slate-100/80 border-slate-300 ring-1 ring-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="permissionOption"
                        checked={!newUserCanPublish}
                        onChange={() => setNewUserCanPublish(false)}
                        className="mt-1 text-emerald-600"
                      />
                      <div>
                        <span className="text-xs font-black text-slate-900 block">صلاحيات محدودة (بدون نشر مباشر)</span>
                        <span className="text-[11px] text-slate-500 font-medium block">
                          لا يمكن للحساب نشر أي عقارات جديدة إلا بعد مراجعة وموافقة المالك الأساسي يدوياً.
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      newUserCanPublish ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="permissionOption"
                        checked={newUserCanPublish}
                        onChange={() => setNewUserCanPublish(true)}
                        className="mt-1 text-emerald-600"
                      />
                      <div>
                        <span className="text-xs font-black text-emerald-900 block">صلاحيات كاملة للنشر المباشر</span>
                        <span className="text-[11px] text-slate-600 font-medium block">
                          يُمنح ترخيصاً فورياً لإضافة ونشر عقاراته على المنصة دون الحاجة لموافقة مسبقة.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">حالة الحساب عند الإنشاء:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserStatus('active')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        newUserStatus === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      نشط فوري
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserStatus('pending')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        newUserStatus === 'pending' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      معلق مؤقتاً
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isSubmittingUser ? 'جاري الإنشاء والحفظ...' : 'إنشاء وحفظ الحساب'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: تأكيد حذف الحساب */}
        {userToDelete && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 relative my-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-base text-center mb-1">
                تأكيد حذف الحساب نهائياً
              </h3>
              <p className="text-xs text-slate-500 text-center mb-4">
                هل أنت متأكد من رغبتك في حذف هذا الحساب؟ لن يتمكن صاحب الحساب من تسجيل الدخول بعد الآن.
              </p>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 mb-5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">اسم الحساب:</span>
                  <span className="font-black text-slate-900">{userToDelete.name || 'بدون اسم'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-slate-800">{userToDelete.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">نوع الحساب:</span>
                  <span className="font-bold text-slate-700">
                    {userToDelete.role === 'client' ? 'عميل' : userToDelete.role === 'owner' ? 'مالك عقارات' : userToDelete.role === 'renter' ? 'بائع/مؤجر' : 'مشرف'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeletingUser}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeletingUser}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isDeletingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>{isDeletingUser ? 'جاري الحذف...' : 'نعم، حذف نهائي'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
