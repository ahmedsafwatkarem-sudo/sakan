import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { Property, UserProfile, UserRole } from './types';
import { addAdminNotification } from './utils/notificationUtils';
import {
  apiFetchUsers,
  apiRegisterUser,
  apiLoginUser,
  apiUpdateUserPermission,
  apiDeleteUser,
  apiFetchProperties,
  apiAddProperty,
  apiUpdateProperty,
  apiDeleteProperty,
  addSyncEventListener,
  connectSyncStream
} from './utils/apiSync';

export const firebaseConfig = {
  apiKey: "AIzaSyD6Y7-AY2svgQMjjFgyWpClxZZg5ze-XY8",
  authDomain: "sakan-plus-b64fe.firebaseapp.com",
  projectId: "sakan-plus-b64fe",
  storageBucket: "sakan-plus-b64fe.firebasestorage.app",
  messagingSenderId: "451740208080",
  appId: "1:451740208080:web:08225bcc1f6c463016c7d5",
  measurementId: "G-L0C5K9GZFJ"
};

// Master Owner Credentials requested by user
export const MASTER_OWNER_PHONE = "01007775402";
export const MASTER_OWNER_PASS = "Asd1351@";

// Function to strictly verify master owner credentials
export function verifyMasterOwnerCredentials(phone: string, pass: string): boolean {
  if (!phone || !pass) return false;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return cleanPhone === MASTER_OWNER_PHONE && pass === MASTER_OWNER_PASS;
}

// Authenticate Master Owner with explicit validation of phone and password
export function authenticateMasterOwner(phone: string, pass: string): { success: boolean; error?: string; profile?: UserProfile } {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  if (cleanPhone !== MASTER_OWNER_PHONE) {
    return {
      success: false,
      error: `اسم المستخدم غير صحيح. يجب استخدام رقم الهاتف المعتمد للمالك: ${MASTER_OWNER_PHONE}`
    };
  }

  if (pass !== MASTER_OWNER_PASS) {
    return {
      success: false,
      error: 'كلمة المرور غير صحيحة لحساب المالك الأساسي. لا يمكن تفعيل صلاحيات المسؤول إلا بكلمة المرور المعتمدة.'
    };
  }

  const profile: UserProfile = {
    uid: 'owner-master',
    phone: MASTER_OWNER_PHONE,
    email: `${MASTER_OWNER_PHONE}@sakanplus.com`,
    role: 'admin',
    name: 'المهندس عبدالله شحاتة (المالك الأساسي والمسؤول)',
    status: 'active',
    canPublish: true,
    publishingRequestStatus: 'approved',
    createdAt: 1729680000000,
    lastActive: Date.now()
  };

  try {
    sessionStorage.setItem('sakan_owner_authenticated', 'true');
  } catch {
    // ignore
  }

  return {
    success: true,
    profile
  };
}

// Initialize Firebase safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Convert Egyptian phone number to standard pseudo email for Firebase Auth
export function phoneToEmail(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `${cleanPhone}@sakanplus.com`;
}

// Check if user is the master admin phone 01007775402
export function isMasterAdmin(phoneOrEmail: string): boolean {
  if (!phoneOrEmail) return false;
  const clean = phoneOrEmail.replace(/[^0-9]/g, '');
  return clean.includes('01007775402') || phoneOrEmail.includes('01007775402');
}

// Initial registered users list for demo/inspection in control panel
export const INITIAL_REGISTERED_USERS: UserProfile[] = [
  {
    uid: 'owner-master',
    phone: '01007775402',
    email: '01007775402@sakanplus.com',
    role: 'admin',
    name: 'المهندس عبدالله شحاتة (المالك الأساسي والمسؤول)',
    status: 'active',
    canPublish: true,
    publishingRequestStatus: 'approved',
    createdAt: Date.now() - 3600000 * 24 * 30,
    lastActive: Date.now()
  },
  {
    uid: 'client-101',
    phone: '01011223344',
    email: '01011223344@sakanplus.com',
    role: 'client',
    name: 'محمد إبراهيم حسان',
    status: 'active',
    canPublish: false,
    publishingRequestStatus: 'none',
    createdAt: Date.now() - 3600000 * 24 * 12,
    lastActive: Date.now() - 3600000 * 2
  },
  {
    uid: 'owner-102',
    phone: '01223344556',
    email: '01223344556@sakanplus.com',
    role: 'owner',
    name: 'أحمد المنشاوي (شركة المنار للاستثمار العقاري)',
    status: 'active',
    canPublish: true, // granted by owner
    publishingRequestStatus: 'approved',
    createdAt: Date.now() - 3600000 * 24 * 7,
    lastActive: Date.now() - 3600000 * 5
  },
  {
    uid: 'renter-103',
    phone: '01123456780',
    email: '01123456780@sakanplus.com',
    role: 'renter',
    name: 'سامي عبد العزيز (مالك شقق بالتجمع)',
    status: 'active',
    canPublish: false, // waiting for master owner approval
    publishingRequestStatus: 'pending',
    createdAt: Date.now() - 3600000 * 24 * 3,
    lastActive: Date.now() - 3600000 * 8
  },
  {
    uid: 'client-104',
    phone: '01556677889',
    email: '01556677889@sakanplus.com',
    role: 'client',
    name: 'د. ياسمين الصاوي',
    status: 'active',
    canPublish: false,
    publishingRequestStatus: 'none',
    createdAt: Date.now() - 3600000 * 24 * 2,
    lastActive: Date.now() - 3600000 * 1
  }
];

// High Performance In-Memory Caching for Admin Panel & App Queries
export let _inMemoryUsersCache: UserProfile[] | null = null;
export let _lastUsersCacheTime = 0;
export let _inMemoryPropsCache: Property[] | null = null;
export let _lastPropsCacheTime = 0;
export const CACHE_TTL_MS = 30000; // 30 seconds cache window

export function invalidateUsersCache(): void {
  _inMemoryUsersCache = null;
  _lastUsersCacheTime = 0;
}

export function invalidatePropsCache(): void {
  _inMemoryPropsCache = null;
  _lastPropsCacheTime = 0;
}

export interface RegisteredAccount {
  phone: string;
  email: string;
  password: string;
  profile: UserProfile;
}

// Get or seed registered accounts for instant direct authentication
export function getRegisteredAccounts(): Record<string, RegisteredAccount> {
  try {
    const raw = localStorage.getItem('sakan_registered_accounts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        // Ensure master owner account is always seeded with exact required credentials
        parsed[MASTER_OWNER_PHONE] = {
          phone: MASTER_OWNER_PHONE,
          email: `${MASTER_OWNER_PHONE}@sakanplus.com`,
          password: MASTER_OWNER_PASS,
          profile: INITIAL_REGISTERED_USERS[0]
        };
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  // Seed default registered accounts for instant access
  const seeded: Record<string, RegisteredAccount> = {
    [MASTER_OWNER_PHONE]: {
      phone: MASTER_OWNER_PHONE,
      email: `${MASTER_OWNER_PHONE}@sakanplus.com`,
      password: MASTER_OWNER_PASS,
      profile: INITIAL_REGISTERED_USERS[0]
    },
    '01011223344': {
      phone: '01011223344',
      email: '01011223344@sakanplus.com',
      password: '123456',
      profile: INITIAL_REGISTERED_USERS[1]
    },
    '01223344556': {
      phone: '01223344556',
      email: '01223344556@sakanplus.com',
      password: '123456',
      profile: INITIAL_REGISTERED_USERS[2]
    },
    '01123456780': {
      phone: '01123456780',
      email: '01123456780@sakanplus.com',
      password: '123456',
      profile: INITIAL_REGISTERED_USERS[3]
    },
    '01556677889': {
      phone: '01556677889',
      email: '01556677889@sakanplus.com',
      password: '123456',
      profile: INITIAL_REGISTERED_USERS[4]
    }
  };

  try {
    localStorage.setItem('sakan_registered_accounts', JSON.stringify(seeded));
  } catch {
    // ignore
  }
  return seeded;
}

export function saveRegisteredAccounts(accounts: Record<string, RegisteredAccount>): void {
  try {
    localStorage.setItem('sakan_registered_accounts', JSON.stringify(accounts));
  } catch (err) {
    console.warn('Failed to save registered accounts:', err);
  }
}

// Fast Instant Login without slow blocking network waits
// Fast Instant Login with server-backed cross-device authentication
export async function loginUserFast(
  phone: string,
  pass: string
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  if (!cleanPhone || cleanPhone.length < 9) {
    return { success: false, error: 'يرجى إدخال رقم هاتف صالح' };
  }

  // 1. Explicit Master Owner validation (01007775402 / Asd1351@)
  if (cleanPhone === MASTER_OWNER_PHONE) {
    if (pass !== MASTER_OWNER_PASS) {
      return {
        success: false,
        error: 'كلمة المرور غير صحيحة لحساب المالك الأساسي. يرجى التأكد من كلمة المرور.'
      };
    }
    const master = authenticateMasterOwner(cleanPhone, pass);
    if (master.profile) {
      saveUserProfile(master.profile).catch(() => {});
      return { success: true, profile: master.profile };
    }
  }

  // 2. Try shared server API login (works seamlessly across different devices & IPs)
  try {
    const apiRes = await apiLoginUser(cleanPhone, pass);
    if (apiRes.success && apiRes.profile) {
      saveUserProfile(apiRes.profile).catch(() => {});
      const accounts = getRegisteredAccounts();
      accounts[cleanPhone] = {
        phone: cleanPhone,
        email: apiRes.profile.email,
        password: pass,
        profile: apiRes.profile
      };
      saveRegisteredAccounts(accounts);
      return { success: true, profile: apiRes.profile };
    } else if (apiRes.error && !apiRes.error.includes('فشل الاتصال')) {
      return { success: false, error: apiRes.error };
    }
  } catch (err) {
    console.warn('apiLoginUser fallback to local:', err);
  }

  // 3. Fallback to registered accounts store
  const accounts = getRegisteredAccounts();
  const acc = accounts[cleanPhone];

  if (acc) {
    if (acc.password && acc.password !== pass) {
      return { success: false, error: 'كلمة المرور غير صحيحة، يرجى إعادة المحاولة' };
    }
    // Update active timestamp
    acc.profile.lastActive = Date.now();
    saveRegisteredAccounts(accounts);
    saveUserProfile(acc.profile).catch(() => {});
    return { success: true, profile: acc.profile };
  }

  // 4. Check if in all registered users directory (e.g. initial demo records)
  const allUsersStr = localStorage.getItem('sakan_all_registered_users');
  const allUsers: UserProfile[] = allUsersStr ? JSON.parse(allUsersStr) : INITIAL_REGISTERED_USERS;
  const existingUser = allUsers.find(u => u.phone === cleanPhone);

  if (existingUser) {
    accounts[cleanPhone] = {
      phone: cleanPhone,
      email: `${cleanPhone}@sakanplus.com`,
      password: pass,
      profile: {
        ...existingUser,
        lastActive: Date.now()
      }
    };
    saveRegisteredAccounts(accounts);
    saveUserProfile(accounts[cleanPhone].profile).catch(() => {});
    return { success: true, profile: accounts[cleanPhone].profile };
  }

  return {
    success: false,
    error: 'هذا الحساب غير مسجل بعد. يرجى الضغط على "إنشاء حساب جديد" لإنشاء حسابك فوراً.'
  };
}

// Fast Instant Registration with server-backed cross-device persistence
export async function registerUserFast(
  phone: string,
  pass: string,
  name: string,
  role: UserRole
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  if (!cleanPhone || cleanPhone.length < 9) {
    return { success: false, error: 'يرجى إدخال رقم هاتف صالح مكون من 10 أو 11 رقم' };
  }

  if (cleanPhone === MASTER_OWNER_PHONE) {
    return {
      success: false,
      error: 'هذا الرقم مسجل بالفعل للمالك الأساسي! يرجى التوجه لتسجيل الدخول المباشر.'
    };
  }

  if (!pass || pass.length < 6) {
    return { success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام' };
  }

  const assignedRole: UserRole = role === 'admin' ? 'client' : role;
  const assignedName = name.trim() || `مستخدم ${cleanPhone.slice(-4)}`;
  const pubRequest = (assignedRole === 'owner' || assignedRole === 'renter') ? 'pending' : 'none';

  // 1. Submit to shared Server API (persists on server disk & broadcasts to Master Owner on any device/IP)
  let serverProfile: UserProfile | null = null;
  try {
    const apiRes = await apiRegisterUser({
      phone: cleanPhone,
      pass,
      name: assignedName,
      role: assignedRole
    });

    if (!apiRes.success && apiRes.error && !apiRes.error.includes('فشل الاتصال')) {
      return { success: false, error: apiRes.error };
    }
    if (apiRes.success && apiRes.profile) {
      serverProfile = apiRes.profile;
    }
  } catch (err) {
    console.warn('apiRegisterUser network notice (using local fallback):', err);
  }

  const newProfile: UserProfile = serverProfile || {
    uid: 'user-' + cleanPhone,
    phone: cleanPhone,
    email: `${cleanPhone}@sakanplus.com`,
    role: assignedRole,
    name: assignedName,
    status: 'active',
    canPublish: false,
    publishingRequestStatus: pubRequest,
    createdAt: Date.now(),
    lastActive: Date.now()
  };

  const accounts = getRegisteredAccounts();
  accounts[cleanPhone] = {
    phone: cleanPhone,
    email: `${cleanPhone}@sakanplus.com`,
    password: pass,
    profile: newProfile
  };

  saveRegisteredAccounts(accounts);
  await saveUserProfile(newProfile).catch(() => {});
  setLastAdminEditTime();

  // Instant notification to Master Owner
  const roleArabic = assignedRole === 'owner' ? 'مالك / بائع عقارات' : assignedRole === 'renter' ? 'مؤجر' : 'عميل';
  addAdminNotification({
    id: `notif-user-reg-${Date.now()}-${cleanPhone}`,
    type: 'new_user',
    title: 'تسجيل مستخدم جديد بالمنصة',
    message: `انضم مستخدم جديد: "${assignedName}" برقم (${cleanPhone}) بصلاحية (${roleArabic}). تم إدراجه فوراً بلوحة التحكم.`,
    createdAt: Date.now(),
    read: false,
    linkType: 'users',
    userId: newProfile.uid,
    userName: assignedName,
    userPhone: cleanPhone,
    userRole: assignedRole
  });

  if (pubRequest === 'pending') {
    addAdminNotification({
      id: `notif-user-pub-${Date.now()}-${cleanPhone}`,
      type: 'publish_request',
      title: 'طلب ترخيص ونشر عقارات',
      message: `يرغب المستخدم "${assignedName}" (${cleanPhone}) في الحصول على صلاحية نشر العقارات.`,
      createdAt: Date.now() + 50,
      read: false,
      linkType: 'pending',
      userId: newProfile.uid,
      userName: assignedName,
      userPhone: cleanPhone,
      userRole: assignedRole
    });
  }

  // Instant window event broadcast so AdminPanel updates in 0ms without delay
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sakan_user_registered', { detail: newProfile }));
  }

  // Bounded non-blocking Promise race with Firebase Auth
  try {
    const email = `${cleanPhone}@sakanplus.com`;
    const fbCreatePromise = createUserWithEmailAndPassword(auth, email, pass)
      .catch((err) => ({ isError: true, error: err }));
    const boundedTimeout = new Promise<{ isTimeout: true }>((resolve) =>
      setTimeout(() => resolve({ isTimeout: true }), 600)
    );
    await Promise.race([fbCreatePromise, boundedTimeout]);
  } catch {
    // Non-blocking fallback
  }

  return {
    success: true,
    profile: newProfile
  };
}

// User Profile Service with instant local read first
export async function getUserProfile(uid: string, fallbackEmail?: string): Promise<UserProfile | null> {
  const phone = fallbackEmail ? fallbackEmail.split('@')[0] : '';
  const isAdmin = isMasterAdmin(phone || uid);

  // 1. Instant read from local cache (0ms)
  const saved = localStorage.getItem(`sakan_user_${uid}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (isAdmin) {
        parsed.role = 'admin';
        parsed.canPublish = true;
      }
      return parsed;
    } catch {
      // ignore
    }
  }

  // 2. Check registered accounts
  const clean = (phone || uid).replace(/[^0-9]/g, '');
  if (clean) {
    const accounts = getRegisteredAccounts();
    if (accounts[clean]) {
      return accounts[clean].profile;
    }
  }

  // 3. Try Firestore with a fast 1500ms timeout
  try {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Firestore read timeout')), 1500)
    );
    const readPromise = getDoc(doc(db, 'users', uid));
    const userDoc = await Promise.race([readPromise, timeoutPromise]);

    if (userDoc.exists()) {
      const data = userDoc.data() as Partial<UserProfile>;
      const userPhone = data.phone || phone;
      const isOwnerAdmin = isMasterAdmin(userPhone);

      const profile: UserProfile = {
        uid,
        phone: userPhone,
        email: fallbackEmail || `${userPhone}@sakanplus.com`,
        role: isOwnerAdmin ? 'admin' : (data.role || 'client'),
        name: data.name || (isOwnerAdmin ? 'إدارة سكن بلس (المالك)' : 'مستخدم سكن بلس'),
        status: data.status || 'active',
        canPublish: isOwnerAdmin ? true : !!data.canPublish,
        publishingRequestStatus: isOwnerAdmin ? 'approved' : (data.publishingRequestStatus || 'none'),
        createdAt: data.createdAt || Date.now(),
        lastActive: Date.now()
      };
      localStorage.setItem(`sakan_user_${uid}`, JSON.stringify(profile));
      return profile;
    }
  } catch (err) {
    console.warn('Could not read user profile from firestore, using fallback:', err);
  }

  if (fallbackEmail || uid) {
    return {
      uid,
      phone: phone || (isAdmin ? MASTER_OWNER_PHONE : '01000000000'),
      email: fallbackEmail || `${phone}@sakanplus.com`,
      role: isAdmin ? 'admin' : 'client',
      name: isAdmin ? 'المهندس عبدالله شحاتة (المالك الأساسي)' : 'عميل سكن بلس',
      status: 'active',
      canPublish: isAdmin,
      publishingRequestStatus: isAdmin ? 'approved' : 'none',
      createdAt: Date.now(),
      lastActive: Date.now()
    };
  }

  return null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  // Save in local user store immediately (0ms)
  localStorage.setItem(`sakan_user_${profile.uid}`, JSON.stringify(profile));

  // Also update overall users directory immediately
  const allUsersStr = localStorage.getItem('sakan_all_registered_users');
  let allUsers: UserProfile[] = allUsersStr ? JSON.parse(allUsersStr) : INITIAL_REGISTERED_USERS;
  const existingIdx = allUsers.findIndex(u => u.uid === profile.uid || u.phone === profile.phone);
  if (existingIdx >= 0) {
    allUsers[existingIdx] = { ...allUsers[existingIdx], ...profile };
  } else {
    allUsers.unshift(profile);
  }
  localStorage.setItem('sakan_all_registered_users', JSON.stringify(allUsers));

  // Update in-memory cache directly (0ms)
  if (_inMemoryUsersCache) {
    const memIdx = _inMemoryUsersCache.findIndex(u => u.uid === profile.uid || u.phone === profile.phone);
    if (memIdx >= 0) {
      _inMemoryUsersCache[memIdx] = { ..._inMemoryUsersCache[memIdx], ...profile };
    } else {
      _inMemoryUsersCache = [profile, ..._inMemoryUsersCache];
    }
  } else {
    _inMemoryUsersCache = allUsers;
  }
  _lastUsersCacheTime = Date.now();

  // Background non-blocking sync with Firestore (saves under both uid and phone)
  try {
    const dataToSave = {
      uid: profile.uid,
      phone: profile.phone,
      email: profile.email,
      role: profile.role,
      name: profile.name || '',
      status: profile.status,
      canPublish: isMasterAdmin(profile.phone) ? true : !!profile.canPublish,
      publishingRequestStatus: isMasterAdmin(profile.phone) ? 'approved' : (profile.publishingRequestStatus || 'none'),
      createdAt: profile.createdAt || Date.now(),
      lastActive: Date.now()
    };

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore timeout')), 2500)
    );
    const savePromise = (async () => {
      await setDoc(doc(db, 'users', profile.uid), dataToSave, { merge: true });
      if (profile.phone && profile.phone !== profile.uid) {
        await setDoc(doc(db, 'users', profile.phone), dataToSave, { merge: true }).catch(() => {});
      }
    })();

    await Promise.race([savePromise, timeoutPromise]);
  } catch (err) {
    console.warn('Non-blocking Firestore user sync notice:', err);
  }
}

// Tracking deleted user phones to ensure deleted accounts are NEVER revived by sync
export function getDeletedUserPhones(): Set<string> {
  try {
    const raw = localStorage.getItem('sakan_deleted_user_phones');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {
    // ignore
  }
  return new Set();
}

export function addDeletedUserPhone(phone: string): void {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const current = getDeletedUserPhones();
    current.add(cleanPhone);
    localStorage.setItem('sakan_deleted_user_phones', JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

// Track timestamp of last edit by Master Owner
export function getLastAdminEditTime(): number {
  try {
    const saved = localStorage.getItem('sakan_admin_last_edit_time');
    if (saved) return Number(saved);
  } catch {
    // ignore
  }
  return Date.now();
}

export function setLastAdminEditTime(): number {
  const now = Date.now();
  try {
    localStorage.setItem('sakan_admin_last_edit_time', now.toString());
  } catch {
    // ignore
  }
  return now;
}

// Real-time listener for Registered Users (0ms instant local emit + live server sync)
export function subscribeToRegisteredUsers(
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const deletedPhones = getDeletedUserPhones();

  // Helper to compile all local users including registered accounts
  const buildCurrentLocalList = (): UserProfile[] => {
    const map = new Map<string, UserProfile>();
    
    // 1. Initial users
    INITIAL_REGISTERED_USERS.forEach((u) => {
      if (!deletedPhones.has(u.phone)) map.set(u.phone, u);
    });

    // 2. Saved local directory
    const localSaved = localStorage.getItem('sakan_all_registered_users');
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed)) {
          parsed.forEach((u: UserProfile) => {
            if (!deletedPhones.has(u.phone)) map.set(u.phone, u);
          });
        }
      } catch {}
    }

    // 3. Registered accounts store
    const accounts = getRegisteredAccounts();
    Object.values(accounts).forEach((acc) => {
      if (acc.profile && !deletedPhones.has(acc.phone)) {
        map.set(acc.phone, acc.profile);
      }
    });

    // Ensure Master Owner
    map.set(MASTER_OWNER_PHONE, {
      ...INITIAL_REGISTERED_USERS[0],
      status: 'active',
      canPublish: true,
      publishingRequestStatus: 'approved'
    });

    return Array.from(map.values());
  };

  // Immediate 0ms emit
  const initialLocalList = buildCurrentLocalList();
  _inMemoryUsersCache = initialLocalList;
  onUpdate(initialLocalList);

  // 1. Connect to Real-time Server SSE Stream (cross-device & cross-IP instant sync)
  connectSyncStream();
  const unsubSse = addSyncEventListener(async (event) => {
    if (event.type === 'user_registered' || event.type === 'user_updated' || event.type === 'user_deleted') {
      try {
        const freshUsers = await apiFetchUsers();
        if (freshUsers && freshUsers.length > 0) {
          const activeDel = getDeletedUserPhones();
          const filtered = freshUsers.filter((u) => !activeDel.has(u.phone));
          _inMemoryUsersCache = filtered;
          _lastUsersCacheTime = Date.now();
          localStorage.setItem('sakan_all_registered_users', JSON.stringify(filtered));
          onUpdate(filtered);
        }
      } catch (err) {
        console.warn('Error refreshing users from server event:', err);
      }
    }
  });

  // Initial fetch from server
  apiFetchUsers().then((serverUsers) => {
    if (serverUsers && serverUsers.length > 0) {
      const activeDel = getDeletedUserPhones();
      const filtered = serverUsers.filter((u) => !activeDel.has(u.phone));
      _inMemoryUsersCache = filtered;
      _lastUsersCacheTime = Date.now();
      localStorage.setItem('sakan_all_registered_users', JSON.stringify(filtered));
      onUpdate(filtered);
    }
  }).catch(() => {});

  // 2. Parallel Firestore listener as secondary backup
  let unsubFirestore = () => {};
  try {
    const q = collection(db, 'users');
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const remoteUsers: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          remoteUsers.push({
            uid: docSnap.id,
            ...(docSnap.data() as Omit<UserProfile, 'uid'>)
          });
        });
        remoteUsers.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

        if (remoteUsers.length > 0) {
          const activeDeleted = getDeletedUserPhones();
          const map = new Map<string, UserProfile>();

          INITIAL_REGISTERED_USERS.forEach((u) => {
            if (!activeDeleted.has(u.phone)) map.set(u.phone, u);
          });

          const currentList = _inMemoryUsersCache || buildCurrentLocalList();
          currentList.forEach((u) => {
            if (!activeDeleted.has(u.phone)) map.set(u.phone, u);
          });

          remoteUsers.forEach((u) => {
            if (!activeDeleted.has(u.phone)) map.set(u.phone, u);
          });

          map.set(MASTER_OWNER_PHONE, {
            ...INITIAL_REGISTERED_USERS[0],
            status: 'active',
            canPublish: true,
            publishingRequestStatus: 'approved'
          });

          const list = Array.from(map.values()).sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
          _inMemoryUsersCache = list;
          _lastUsersCacheTime = Date.now();
          localStorage.setItem('sakan_all_registered_users', JSON.stringify(list));
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('Real-time users listener fallback notice:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not establish users snapshot listener:', err);
  }

  return () => {
    unsubSse();
    unsubFirestore();
  };
}

// Real-time listener for Remote Properties (0ms instant local emit + live server sync)
export function subscribeToRemoteProperties(
  onUpdate: (properties: Property[]) => void,
  onError?: (err: any) => void
): () => void {
  // Emit locally cached properties first
  const localPropsSaved = localStorage.getItem('sakan_local_properties');
  if (localPropsSaved) {
    try {
      const parsedProps = JSON.parse(localPropsSaved);
      if (Array.isArray(parsedProps) && parsedProps.length > 0) {
        onUpdate(parsedProps);
      }
    } catch {}
  } else if (_inMemoryPropsCache && _inMemoryPropsCache.length > 0) {
    onUpdate(_inMemoryPropsCache);
  }

  // 1. Connect to Real-time Server SSE Stream (cross-device instant sync)
  connectSyncStream();
  const unsubSse = addSyncEventListener(async (event) => {
    if (event.type === 'property_added' || event.type === 'property_updated' || event.type === 'property_deleted') {
      try {
        const freshProps = await apiFetchProperties();
        if (freshProps && freshProps.length > 0) {
          _inMemoryPropsCache = freshProps;
          _lastPropsCacheTime = Date.now();
          localStorage.setItem('sakan_local_properties', JSON.stringify(freshProps));
          onUpdate(freshProps);
        }
      } catch (err) {
        console.warn('Error refreshing properties from server event:', err);
      }
    }
  });

  // Initial fetch from server
  apiFetchProperties().then((serverProps) => {
    if (serverProps && serverProps.length > 0) {
      _inMemoryPropsCache = serverProps;
      _lastPropsCacheTime = Date.now();
      localStorage.setItem('sakan_local_properties', JSON.stringify(serverProps));
      onUpdate(serverProps);
    }
  }).catch(() => {});

  // 2. Parallel Firestore listener as secondary backup
  let unsubFirestore = () => {};
  try {
    const q = collection(db, 'properties');
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const properties: Property[] = [];
        snapshot.forEach((docSnap) => {
          properties.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Property, 'id'>)
          });
        });
        properties.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

        if (properties.length > 0) {
          _inMemoryPropsCache = properties;
          _lastPropsCacheTime = Date.now();
          localStorage.setItem('sakan_remote_properties', JSON.stringify(properties));
          onUpdate(properties);
        }
      },
      (err) => {
        console.warn('Real-time properties listener fallback notice:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Could not establish properties snapshot listener:', err);
  }

  return () => {
    unsubSse();
    unsubFirestore();
  };
}

// Fetch all registered users for Admin Panel with server sync & high-speed SWR cache
export async function fetchAllRegisteredUsers(forceRefresh = false): Promise<UserProfile[]> {
  const activeDeleted = getDeletedUserPhones();
  const accounts = getRegisteredAccounts();

  const mergeAccountsInto = (list: UserProfile[]): UserProfile[] => {
    const map = new Map<string, UserProfile>();
    list.forEach((u) => {
      if (!activeDeleted.has(u.phone)) map.set(u.phone, u);
    });
    Object.values(accounts).forEach((acc) => {
      if (acc.profile && !activeDeleted.has(acc.phone)) {
        map.set(acc.phone, acc.profile);
      }
    });
    map.set(MASTER_OWNER_PHONE, {
      ...INITIAL_REGISTERED_USERS[0],
      status: 'active',
      canPublish: true,
      publishingRequestStatus: 'approved'
    });
    return Array.from(map.values());
  };

  // 1. Instant Memory Cache Return (0ms latency)
  if (!forceRefresh && _inMemoryUsersCache && Date.now() - _lastUsersCacheTime < CACHE_TTL_MS) {
    return mergeAccountsInto(_inMemoryUsersCache);
  }

  // 2. Fetch from shared server API (multi-device, cross-IP directory)
  try {
    const serverUsers = await apiFetchUsers();
    if (serverUsers && serverUsers.length > 0) {
      const merged = mergeAccountsInto(serverUsers);
      _inMemoryUsersCache = merged;
      _lastUsersCacheTime = Date.now();
      localStorage.setItem('sakan_all_registered_users', JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('apiFetchUsers failed, using fallback:', err);
  }

  // 3. Fallback to local storage cache
  let localFallback: UserProfile[] = INITIAL_REGISTERED_USERS.filter((u) => !activeDeleted.has(u.phone));
  const localSaved = localStorage.getItem('sakan_all_registered_users');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localFallback = parsed.filter((u: UserProfile) => !activeDeleted.has(u.phone));
      }
    } catch {}
  }
  localFallback = mergeAccountsInto(localFallback);
  _inMemoryUsersCache = localFallback;

  return _inMemoryUsersCache || localFallback;
}

// Update user permissions with instant optimistic local sync + server persist
export async function updateUserPublishingPermission(
  uid: string, 
  canPublish: boolean,
  requestStatus: 'approved' | 'rejected' | 'pending' | 'none'
): Promise<void> {
  // 1. Optimistically update in-memory cache immediately (0ms)
  if (_inMemoryUsersCache) {
    _inMemoryUsersCache = _inMemoryUsersCache.map((u) =>
      u.uid === uid
        ? { ...u, canPublish, publishingRequestStatus: requestStatus }
        : u
    );
  }

  // 2. Optimistically update local storage
  const allUsersStr = localStorage.getItem('sakan_all_registered_users');
  if (allUsersStr) {
    try {
      const allUsers: UserProfile[] = JSON.parse(allUsersStr);
      const idx = allUsers.findIndex((u) => u.uid === uid);
      if (idx >= 0) {
        allUsers[idx].canPublish = canPublish;
        allUsers[idx].publishingRequestStatus = requestStatus;
        localStorage.setItem('sakan_all_registered_users', JSON.stringify(allUsers));
        localStorage.setItem(`sakan_user_${uid}`, JSON.stringify(allUsers[idx]));
      }
    } catch (e) {
      console.warn('Local update error:', e);
    }
  }

  // Update registered accounts store
  try {
    const accounts = getRegisteredAccounts();
    let accountUpdated = false;
    Object.keys(accounts).forEach((key) => {
      const acc = accounts[key];
      if (acc && acc.profile && (acc.profile.uid === uid || acc.phone === uid.replace('user-', ''))) {
        acc.profile.canPublish = canPublish;
        acc.profile.publishingRequestStatus = requestStatus;
        accountUpdated = true;
      }
    });
    if (accountUpdated) {
      saveRegisteredAccounts(accounts);
    }
  } catch (err) {
    console.warn('Error syncing account profile permission:', err);
  }

  // 3. Mark admin edit timestamp
  setLastAdminEditTime();

  // 4. Persist to shared Server API (updates server disk and broadcasts to all devices)
  try {
    await apiUpdateUserPermission(uid, canPublish, requestStatus);
  } catch (err) {
    console.warn('Server permission update notice:', err);
  }

  // 5. Asynchronously persist to Firestore in background
  try {
    await updateDoc(doc(db, 'users', uid), {
      canPublish,
      publishingRequestStatus: requestStatus
    });
  } catch (err) {
    console.warn('Firestore update error (optimistically saved):', err);
  }
}

// Create New User Account directly from Master Owner Admin Panel
export async function createNewUserAccountByAdmin(userData: {
  name: string;
  phone: string;
  password?: string;
  role: UserRole;
  canPublish: boolean;
  status?: 'active' | 'pending';
}): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  const cleanPhone = (userData.phone || '').replace(/[^0-9]/g, '');

  if (!cleanPhone || cleanPhone.length < 9) {
    return { success: false, error: 'رقم الهاتف غير صالح، يرجى إدخال رقم صحيح مكون من 10 أو 11 رقم' };
  }

  if (cleanPhone === MASTER_OWNER_PHONE) {
    return { success: false, error: 'هذا الرقم مخصص حصرياً للمالك الأساسي للمنصة' };
  }

  // Try creating on server first
  try {
    const apiRes = await apiRegisterUser({
      phone: cleanPhone,
      pass: userData.password || '123456',
      name: userData.name,
      role: userData.role
    });

    if (apiRes.success && apiRes.profile) {
      if (userData.canPublish) {
        await apiUpdateUserPermission(apiRes.profile.uid, true, 'approved').catch(() => {});
        apiRes.profile.canPublish = true;
        apiRes.profile.publishingRequestStatus = 'approved';
      }
      return { success: true, profile: apiRes.profile };
    }
  } catch (err) {
    console.warn('apiRegisterUser by admin notice:', err);
  }

  const accounts = getRegisteredAccounts();
  const existingUsers = await fetchAllRegisteredUsers();
  
  if (existingUsers.some((u) => u.phone === cleanPhone) || accounts[cleanPhone]) {
    return { success: false, error: 'يوجد حساب مسجل بالفعل برقم الهاتف هذا' };
  }

  try {
    const deletedSet = getDeletedUserPhones();
    if (deletedSet.has(cleanPhone)) {
      deletedSet.delete(cleanPhone);
      localStorage.setItem('sakan_deleted_user_phones', JSON.stringify(Array.from(deletedSet)));
    }
  } catch {}

  const uid = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const email = `${cleanPhone}@sakanplus.com`;
  const password = userData.password || '123456';

  const profile: UserProfile = {
    uid,
    phone: cleanPhone,
    email,
    role: userData.role,
    name: userData.name.trim() || 'مستخدم جديد',
    status: userData.status || 'active',
    canPublish: userData.canPublish,
    publishingRequestStatus: userData.canPublish ? 'approved' : 'none',
    createdAt: Date.now(),
    lastActive: Date.now()
  };

  accounts[cleanPhone] = {
    phone: cleanPhone,
    email,
    password,
    profile
  };
  saveRegisteredAccounts(accounts);

  const updatedAllUsers = [profile, ...existingUsers];
  localStorage.setItem('sakan_all_registered_users', JSON.stringify(updatedAllUsers));
  _inMemoryUsersCache = updatedAllUsers;
  _lastUsersCacheTime = Date.now();
  setLastAdminEditTime();

  return { success: true, profile };
}

// Delete User Account By Master Owner
export async function deleteUserAccountByAdmin(
  uid: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  if (cleanPhone === MASTER_OWNER_PHONE || uid === 'owner-master' || isMasterAdmin(cleanPhone)) {
    return {
      success: false,
      error: 'لا يمكن حذف حساب المالك الأساسي للمنصة نهائياً!'
    };
  }

  // 1. Delete on server (persists to server disk & broadcasts to all devices)
  try {
    await apiDeleteUser(uid, cleanPhone);
  } catch (err) {
    console.warn('apiDeleteUser notice:', err);
  }

  // 2. Local blacklist and cleanup
  addDeletedUserPhone(cleanPhone);

  const accounts = getRegisteredAccounts();
  if (accounts[cleanPhone]) {
    delete accounts[cleanPhone];
    saveRegisteredAccounts(accounts);
  }

  let allUsers: UserProfile[] = [];
  try {
    const raw = localStorage.getItem('sakan_all_registered_users');
    if (raw) {
      allUsers = JSON.parse(raw);
    }
  } catch {
    allUsers = _inMemoryUsersCache || [];
  }

  const updatedUsers = allUsers.filter((u) => u.uid !== uid && u.phone !== cleanPhone);
  localStorage.setItem('sakan_all_registered_users', JSON.stringify(updatedUsers));
  localStorage.removeItem(`sakan_user_${uid}`);
  _inMemoryUsersCache = updatedUsers;
  _lastUsersCacheTime = Date.now();

  setLastAdminEditTime();

  // 3. Delete from Firestore if available
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn('Firestore delete user background notice:', err);
  }

  return { success: true };
}

// Fetch Properties Service (Server API primary + SWR cache)
export async function fetchRemoteProperties(forceRefresh = false): Promise<Property[]> {
  if (!forceRefresh && _inMemoryPropsCache && Date.now() - _lastPropsCacheTime < CACHE_TTL_MS) {
    return _inMemoryPropsCache;
  }

  // 1. Fetch from shared server API
  try {
    const serverProps = await apiFetchProperties();
    if (serverProps && serverProps.length > 0) {
      _inMemoryPropsCache = serverProps;
      _lastPropsCacheTime = Date.now();
      localStorage.setItem('sakan_local_properties', JSON.stringify(serverProps));
      return serverProps;
    }
  } catch (err) {
    console.warn('apiFetchProperties notice:', err);
  }

  // 2. Fetch from Firestore if available
  try {
    const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Properties query timeout')), 3500)
    );
    const snapshotPromise = getDocs(q);
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);
    
    const properties: Property[] = [];
    snapshot.forEach((docSnap) => {
      properties.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Property, 'id'>)
      });
    });

    if (properties.length > 0) {
      _inMemoryPropsCache = properties;
      _lastPropsCacheTime = Date.now();
      localStorage.setItem('sakan_remote_properties', JSON.stringify(properties));
      return properties;
    }
  } catch (err) {
    console.warn('Firestore properties fetch notice:', err);
  }

  if (_inMemoryPropsCache) return _inMemoryPropsCache;

  const localSaved = localStorage.getItem('sakan_local_properties');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _inMemoryPropsCache = parsed;
        return parsed;
      }
    } catch {}
  }

  return [];
}

export async function addRemoteProperty(property: Omit<Property, 'id'>): Promise<string> {
  // 1. Submit to shared server API (enforces pending status unless authorized, saves to disk & broadcasts via SSE)
  let serverAssignedId: string | null = null;
  let fullProp: Property | null = null;

  try {
    const res = await apiAddProperty(property);
    if (res && res.id) {
      serverAssignedId = res.id;
      fullProp = res.property || { id: res.id, ...property };
    }
  } catch (err) {
    console.warn('apiAddProperty notice (using local fallback):', err);
  }

  const finalId = serverAssignedId || `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const propToSave: Property = fullProp || { id: finalId, ...property };

  // 2. Dual-sync with Firestore with identical ID so Firestore onSnapshot listeners trigger worldwide
  try {
    await setDoc(doc(db, 'properties', finalId), propToSave, { merge: true });
  } catch (fsErr) {
    console.warn('Firestore dual-sync notice for property:', fsErr);
  }

  // 3. Update in-memory & local cache
  if (_inMemoryPropsCache) {
    _inMemoryPropsCache = [propToSave, ..._inMemoryPropsCache.filter((p) => p.id !== finalId)];
  } else {
    _inMemoryPropsCache = [propToSave];
  }
  _lastPropsCacheTime = Date.now();

  try {
    const rawLocal = localStorage.getItem('sakan_local_properties');
    const list: Property[] = rawLocal ? JSON.parse(rawLocal) : [];
    const updated = [propToSave, ...list.filter((p) => p.id !== finalId)];
    localStorage.setItem('sakan_local_properties', JSON.stringify(updated));
  } catch {}

  setLastAdminEditTime();
  return finalId;
}

export async function updateRemoteProperty(id: string, updates: Partial<Property>): Promise<void> {
  // 1. Optimistically update in-memory cache
  if (_inMemoryPropsCache) {
    _inMemoryPropsCache = _inMemoryPropsCache.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
  }

  // 2. Persist to local cache
  try {
    const rawLocal = localStorage.getItem('sakan_local_properties');
    if (rawLocal) {
      const list: Property[] = JSON.parse(rawLocal);
      const updated = list.map((p) => (p.id === id ? { ...p, ...updates } : p));
      localStorage.setItem('sakan_local_properties', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error updating local properties cache:', err);
  }

  setLastAdminEditTime();

  // 3. Update shared server API (broadcasts to all connected devices)
  try {
    await apiUpdateProperty(id, updates);
  } catch (err) {
    console.warn('apiUpdateProperty notice:', err);
  }

  // 4. Update Firestore if not local/mock id
  if (id.startsWith('local-') || id.startsWith('mock-')) return;
  try {
    await updateDoc(doc(db, 'properties', id), updates);
  } catch (err) {
    console.warn('Firestore property update notice:', err);
  }
}

export async function deleteRemoteProperty(id: string): Promise<void> {
  // 1. Optimistically update in-memory cache
  if (_inMemoryPropsCache) {
    _inMemoryPropsCache = _inMemoryPropsCache.filter((p) => p.id !== id);
  }

  // 2. Persist removal to local cache
  try {
    const rawLocal = localStorage.getItem('sakan_local_properties');
    if (rawLocal) {
      const list: Property[] = JSON.parse(rawLocal);
      const updated = list.filter((p) => p.id !== id);
      localStorage.setItem('sakan_local_properties', JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error deleting from local properties cache:', err);
  }

  setLastAdminEditTime();

  // 3. Delete from shared server API
  try {
    await apiDeleteProperty(id);
  } catch (err) {
    console.warn('apiDeleteProperty notice:', err);
  }

  // 4. Delete from Firestore if not local/mock id
  if (id.startsWith('local-') || id.startsWith('mock-')) return;
  try {
    await deleteDoc(doc(db, 'properties', id));
  } catch (err) {
    console.warn('Firestore property delete notice:', err);
  }
}
