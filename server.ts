import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.resolve(__dirname, 'data/server_db.json');

// Ensure data folder exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Master Owner Credentials
const MASTER_OWNER_PHONE = '01007775402';
const MASTER_OWNER_PASS = 'Asd1351@';

// Database Schema
interface ServerUser {
  uid: string;
  phone: string;
  email: string;
  password?: string;
  name: string;
  role: 'admin' | 'owner' | 'renter' | 'client';
  status: 'active' | 'pending';
  canPublish: boolean;
  publishingRequestStatus: 'approved' | 'rejected' | 'pending' | 'none';
  createdAt: number;
  lastActive: number;
}

interface ServerProperty {
  id: string;
  title: string;
  description: string;
  price: number;
  type: 'sale' | 'rent';
  category: string;
  location: string;
  addressDetails?: string;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  finishing: string;
  images: string[];
  video?: string;
  contactPhone: string;
  whatsapp: string;
  ownerId: string;
  ownerName: string;
  status: 'active' | 'pending' | 'sold';
  featured?: boolean;
  createdAt: number;
  averageRating?: number;
  reviewsCount?: number;
  reviews?: any[];
}

interface ServerAdminNotification {
  id: string;
  type: 'new_user' | 'new_property' | 'publish_request' | 'booking_request' | 'system';
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  linkType?: 'properties' | 'users' | 'bookings' | 'pending';
  propertyId?: string;
  propertyTitle?: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  userRole?: string;
}

interface ServerDatabase {
  users: ServerUser[];
  properties: ServerProperty[];
  notifications: ServerAdminNotification[];
  bookings: any[];
}

// Initial Data Seed
const defaultMasterAdmin: ServerUser = {
  uid: 'owner-master',
  phone: MASTER_OWNER_PHONE,
  email: `${MASTER_OWNER_PHONE}@sakanplus.com`,
  password: MASTER_OWNER_PASS,
  name: 'المهندس عبدالله شحاتة (المالك الأساسي والمسؤول)',
  role: 'admin',
  status: 'active',
  canPublish: true,
  publishingRequestStatus: 'approved',
  createdAt: 1729680000000,
  lastActive: Date.now()
};

const initialUsersSeed: ServerUser[] = [
  defaultMasterAdmin,
  {
    uid: 'client-101',
    phone: '01011223344',
    email: '01011223344@sakanplus.com',
    password: '123456',
    name: 'محمد إبراهيم حسان',
    role: 'client',
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
    password: '123456',
    name: 'أحمد المنشاوي (شركة المنار للاستثمار العقاري)',
    role: 'owner',
    status: 'active',
    canPublish: true,
    publishingRequestStatus: 'approved',
    createdAt: Date.now() - 3600000 * 24 * 7,
    lastActive: Date.now() - 3600000 * 5
  },
  {
    uid: 'renter-103',
    phone: '01123456780',
    email: '01123456780@sakanplus.com',
    password: '123456',
    name: 'سامي عبد العزيز (مالك شقق بالتجمع)',
    role: 'renter',
    status: 'active',
    canPublish: false,
    publishingRequestStatus: 'pending',
    createdAt: Date.now() - 3600000 * 24 * 3,
    lastActive: Date.now() - 3600000 * 8
  },
  {
    uid: 'client-104',
    phone: '01556677889',
    email: '01556677889@sakanplus.com',
    password: '123456',
    name: 'د. ياسمين الصاوي',
    role: 'client',
    status: 'active',
    canPublish: false,
    publishingRequestStatus: 'none',
    createdAt: Date.now() - 3600000 * 24 * 2,
    lastActive: Date.now() - 3600000 * 1
  }
];

const initialPropertiesSeed: ServerProperty[] = [
  {
    id: 'prop-1',
    title: 'فيلا فاخرة بحمام سباحة خاص بالتجمع الخامس',
    description: 'فيلا مستقلة رائعة بتشطيب ألترا سوبر لوكس داخل كمبوند راقٍ في التجمع الخامس (القاهرة الجديدة). تضم حديقة خاصة كبيرة، حمام سباحة مدفأ، موقف سيارات، أمن وحراسة 24 ساعة، بالقرب من شارع التسعين والجامعة الأمريكية.',
    price: 18500000,
    type: 'sale',
    category: 'villa',
    location: 'التجمع الخامس، القاهرة الجديدة',
    addressDetails: 'كمبوند ديار، بالقرب من شارع التسعين الجنوبي',
    bedrooms: 5,
    bathrooms: 6,
    area: 550,
    floor: 'أرضي + أول + روف',
    finishing: 'ultra_lux',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ],
    contactPhone: MASTER_OWNER_PHONE,
    whatsapp: '201007775402',
    ownerId: 'owner-master',
    ownerName: 'المهندس عبدالله شحاتة',
    status: 'active',
    createdAt: Date.now() - 3600000 * 24,
    featured: true,
    averageRating: 5.0,
    reviewsCount: 2
  },
  {
    id: 'prop-2',
    title: 'شقة مودرن مفروشة للإيجار في الشيخ زايد',
    description: 'شقة أنيقة مفروشة بالكامل بأحدث الأجهزة والتكييفات المركزية، إطلالة مفتوحة على مساحات خضراء، كمبوند هادئ مع خدمات متكاملة ونادي صحي، قريبة من هايبر وان ومول العرب.',
    price: 35000,
    type: 'rent',
    category: 'apartment',
    location: 'الشيخ زايد، الجيزة',
    addressDetails: 'كمبوند بيفرلي هيلز، الشيخ زايد',
    bedrooms: 3,
    bathrooms: 2,
    area: 175,
    floor: 'الدور الثاني',
    finishing: 'super_lux',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
    ],
    contactPhone: MASTER_OWNER_PHONE,
    whatsapp: '201007775402',
    ownerId: 'owner-master',
    ownerName: 'المهندس عبدالله شحاتة',
    status: 'active',
    createdAt: Date.now() - 3600000 * 48,
    featured: true
  },
  {
    id: 'prop-baltim-1',
    title: 'شقة مصيفية فاخرة صف أول على البحر مباشرة بشاطئ النرجس (بلطيم)',
    description: 'شقة مصيفية استثنائية ترى البحر بالكامل من التراس والريسبشن، شاطئ النرجس الراقي بمصيف بلطيم (كفر الشيخ). خطوات معدودة للشاطئ، مفروشة ومجهزة بالكامل، مناسبة للعائلات والباحثين عن الهدوء والراحة.',
    price: 1850000,
    type: 'sale',
    category: 'summer_apartment',
    location: 'مصيف بلطيم، كفر الشيخ',
    addressDetails: 'شاطئ النرجس، صف أول على الكورنيش، مصيف بلطيم',
    bedrooms: 3,
    bathrooms: 2,
    area: 130,
    floor: 'الدور الثالث بمصعد',
    finishing: 'super_lux',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80'
    ],
    contactPhone: MASTER_OWNER_PHONE,
    whatsapp: '201007775402',
    ownerId: 'owner-master',
    ownerName: 'المهندس عبدالله شحاتة',
    status: 'active',
    createdAt: Date.now() - 3600000 * 12,
    featured: true
  }
];

const initialNotificationsSeed: ServerAdminNotification[] = [
  {
    id: 'admin-init-welcome',
    type: 'system',
    title: 'مرحباً بك في مركز الإشعارات والتحكم للمالك الأساسي',
    message: 'هنا يتم استقبال كافة إشعارات المنصة لحظياً عبر الأجهزة المختلفة: تسجيل مستخدمين جدد، طلبات تراخيص النشر، والعقارات المعلقة بانتظار الاعتماد.',
    createdAt: Date.now() - 3600000 * 2,
    read: true,
    linkType: 'users'
  }
];

// Load Database
let db: ServerDatabase = {
  users: [...initialUsersSeed],
  properties: [...initialPropertiesSeed],
  notifications: [...initialNotificationsSeed],
  bookings: []
};

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.users) && parsed.users.length > 0) {
        db.users = parsed.users;
      }
      if (Array.isArray(parsed.properties) && parsed.properties.length > 0) {
        db.properties = parsed.properties;
      }
      if (Array.isArray(parsed.notifications)) {
        db.notifications = parsed.notifications;
      }
      if (Array.isArray(parsed.bookings)) {
        db.bookings = parsed.bookings;
      }
    }
  } catch (err) {
    console.error('Error reading DB_FILE, using defaults:', err);
  }
}

// Ensure Master Owner is strictly present with full permissions and credentials
const masterIdx = db.users.findIndex((u) => u.phone === MASTER_OWNER_PHONE);
if (masterIdx >= 0) {
  db.users[masterIdx] = {
    ...db.users[masterIdx],
    ...defaultMasterAdmin,
    password: MASTER_OWNER_PASS
  };
} else {
  db.users.unshift(defaultMasterAdmin);
}

function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database to disk:', err);
  }
}

// Save initial DB
saveDatabase();

// Real-Time Server-Sent Events (SSE) Client Connections
const sseClients = new Set<Response>();

function broadcastSse(type: string, data: any) {
  const payload = JSON.stringify({
    type,
    data,
    timestamp: Date.now()
  });
  const message = `data: ${payload}\n\n`;

  sseClients.forEach((res) => {
    try {
      res.write(message);
    } catch {
      sseClients.delete(res);
    }
  });
}

// Keep SSE alive every 25s
setInterval(() => {
  sseClients.forEach((res) => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      sseClients.delete(res);
    }
  });
}, 25000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // SSE Stream Endpoint
  app.get('/api/sync/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial handshake
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // GET Users
  app.get('/api/users', (_req: Request, res: Response) => {
    // Return sanitized users without exposing raw passwords
    const safeUsers = db.users.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  // Register New User
  app.post('/api/users/register', (req: Request, res: Response) => {
    const { phone, pass, name, role } = req.body;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    if (!cleanPhone || cleanPhone.length < 9) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رقم هاتف صالح مكون من 10 أو 11 رقم' });
    }

    if (cleanPhone === MASTER_OWNER_PHONE) {
      return res.status(400).json({ success: false, error: 'هذا الرقم مخصص حصرياً للمالك الأساسي للمنصة' });
    }

    if (!pass || pass.length < 6) {
      return res.status(400).json({ success: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام' });
    }

    const existing = db.users.find((u) => u.phone === cleanPhone);
    if (existing) {
      return res.status(400).json({ success: false, error: 'هذا الرقم مسجل بالفعل مسبقاً! يرجى تسجيل الدخول المباشر.' });
    }

    const assignedRole = role === 'admin' ? 'client' : (role || 'client');
    const assignedName = (name || '').trim() || `مستخدم ${cleanPhone.slice(-4)}`;
    const pubRequest = (assignedRole === 'owner' || assignedRole === 'renter') ? 'pending' : 'none';

    const newUser: ServerUser = {
      uid: 'user-' + cleanPhone,
      phone: cleanPhone,
      email: `${cleanPhone}@sakanplus.com`,
      password: pass,
      role: assignedRole,
      name: assignedName,
      status: 'active',
      canPublish: false,
      publishingRequestStatus: pubRequest,
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    db.users.unshift(newUser);

    // Create Notification for Master Owner
    const roleArabic = assignedRole === 'owner' ? 'مالك / بائع عقارات' : assignedRole === 'renter' ? 'مؤجر' : 'عميل';
    const notif: ServerAdminNotification = {
      id: `notif-user-reg-${Date.now()}-${cleanPhone}`,
      type: 'new_user',
      title: 'تسجيل مستخدم جديد بالمنصة',
      message: `انضم مستخدم جديد: "${assignedName}" برقم (${cleanPhone}) بصلاحية (${roleArabic}). في انتظار الاعتماد ومنح الصلاحيات من المالك.`,
      createdAt: Date.now(),
      read: false,
      linkType: 'users',
      userId: newUser.uid,
      userName: assignedName,
      userPhone: cleanPhone,
      userRole: assignedRole
    };
    db.notifications.unshift(notif);

    if (pubRequest === 'pending') {
      const pubNotif: ServerAdminNotification = {
        id: `notif-user-pub-${Date.now()}-${cleanPhone}`,
        type: 'publish_request',
        title: 'طلب ترخيص ونشر عقارات',
        message: `يرغب المستخدم "${assignedName}" (${cleanPhone}) في الحصول على صلاحية وترخيص نشر العقارات.`,
        createdAt: Date.now() + 50,
        read: false,
        linkType: 'pending',
        userId: newUser.uid,
        userName: assignedName,
        userPhone: cleanPhone,
        userRole: assignedRole
      };
      db.notifications.unshift(pubNotif);
    }

    saveDatabase();

    // Broadcast Real-time Event to all connected devices / IPs
    broadcastSse('user_registered', { user: newUser, notification: notif });

    const { password: _, ...safeProfile } = newUser;
    res.json({ success: true, profile: safeProfile });
  });

  // Login User
  app.post('/api/users/login', (req: Request, res: Response) => {
    const { phone, pass } = req.body;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال رقم الهاتف' });
    }

    // Master Owner validation
    if (cleanPhone === MASTER_OWNER_PHONE) {
      if (pass !== MASTER_OWNER_PASS) {
        return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة لحساب المالك الأساسي' });
      }
      return res.json({ success: true, profile: defaultMasterAdmin });
    }

    const user = db.users.find((u) => u.phone === cleanPhone);
    if (!user) {
      return res.status(404).json({ success: false, error: 'هذا الحساب غير مسجل بعد. يرجى إنشاء حساب جديد.' });
    }

    if (user.password && user.password !== pass) {
      return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
    }

    user.lastActive = Date.now();
    saveDatabase();

    const { password: _, ...safeProfile } = user;
    res.json({ success: true, profile: safeProfile });
  });

  // Update User Permissions (by Master Owner)
  app.patch('/api/users/:uid/permission', (req: Request, res: Response) => {
    const { uid } = req.params;
    const { canPublish, publishingRequestStatus } = req.body;

    const user = db.users.find((u) => u.uid === uid || u.phone === uid.replace('user-', ''));
    if (!user) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    // Protection for Master Owner
    if (user.phone === MASTER_OWNER_PHONE) {
      user.canPublish = true;
      user.publishingRequestStatus = 'approved';
      return res.json({ success: true, profile: user });
    }

    user.canPublish = Boolean(canPublish);
    if (publishingRequestStatus) {
      user.publishingRequestStatus = publishingRequestStatus;
    }

    saveDatabase();

    // Broadcast permission change
    broadcastSse('user_updated', { uid: user.uid, canPublish: user.canPublish, publishingRequestStatus: user.publishingRequestStatus });

    res.json({ success: true, profile: user });
  });

  // Delete User (by Master Owner)
  app.delete('/api/users/:uid', (req: Request, res: Response) => {
    const { uid } = req.params;
    const phone = req.query.phone as string;

    const user = db.users.find((u) => u.uid === uid || (phone && u.phone === phone));
    if (!user) {
      return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
    }

    // Strict Master Owner immunity
    if (user.phone === MASTER_OWNER_PHONE || user.uid === 'owner-master') {
      return res.status(403).json({ success: false, error: 'لا يمكن حذف حساب المالك الأساسي للمنصة نهائياً!' });
    }

    db.users = db.users.filter((u) => u.uid !== user.uid && u.phone !== user.phone);
    saveDatabase();

    broadcastSse('user_deleted', { uid: user.uid, phone: user.phone });
    res.json({ success: true });
  });

  // GET Properties (cross-device sync: returns full catalog so owner dashboard receives pending approvals from any device)
  app.get('/api/properties', (req: Request, res: Response) => {
    const publicOnly = req.query.publicOnly === 'true';
    if (publicOnly) {
      const activeProps = db.properties.filter((p) => p.status === 'active');
      return res.json(activeProps);
    }
    res.json(db.properties);
  });

  // POST Add Property
  app.post('/api/properties', (req: Request, res: Response) => {
    const propData = req.body;

    if (!propData.title || !propData.price || !propData.location) {
      return res.status(400).json({ success: false, error: 'بيانات العقار غير مكتملة' });
    }

    const contactPhoneClean = (propData.contactPhone || '').replace(/[^0-9]/g, '');
    const isMaster = contactPhoneClean === MASTER_OWNER_PHONE || propData.ownerId === 'owner-master';

    // Verify whether the owner of the property has publishing permission
    const authorUser = db.users.find(
      (u) => u.uid === propData.ownerId || (contactPhoneClean && u.phone === contactPhoneClean)
    );
    const hasPublishPermission = isMaster || (authorUser ? authorUser.canPublish === true : false);

    // CRITICAL ENFORCEMENT: If not authorized, property is STRICTLY set to 'pending'
    const finalStatus: 'active' | 'pending' = hasPublishPermission ? 'active' : 'pending';

    const newId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProperty: ServerProperty = {
      ...propData,
      id: newId,
      status: finalStatus,
      featured: isMaster ? Boolean(propData.featured) : false,
      createdAt: Date.now()
    };

    db.properties.unshift(newProperty);

    // Create Admin Notification for Master Owner
    const ownerNameDisplay = propData.ownerName || authorUser?.name || 'مستخدم مسجل';
    const notif: ServerAdminNotification = {
      id: `notif-prop-${Date.now()}-${newId}`,
      type: 'new_property',
      title: finalStatus === 'pending' ? 'عقار جديد ينتظر موافقة واعتماد المالك' : 'إعلان عقار جديد',
      message: `قام المعلن "${ownerNameDisplay}" (${contactPhoneClean}) بإضافة عقار: "${propData.title}" في (${propData.location}) بسعر ${Number(propData.price).toLocaleString()} ج.م.${
        finalStatus === 'pending' ? ' [يحتاج موافقة واعتماد المالك الأساسي للنشر]' : ''
      }`,
      createdAt: Date.now(),
      read: false,
      linkType: 'pending',
      propertyId: newId,
      propertyTitle: propData.title,
      userId: propData.ownerId,
      userName: ownerNameDisplay,
      userPhone: contactPhoneClean
    };
    db.notifications.unshift(notif);

    saveDatabase();

    // Broadcast Real-time Event to all connected devices / IPs
    broadcastSse('property_added', { property: newProperty, notification: notif });

    res.json({ success: true, id: newId, property: newProperty });
  });

  // PATCH Property (Status change, approval, edit)
  app.patch('/api/properties/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const idx = db.properties.findIndex((p) => p.id === id);
    if (idx === 0 || idx > 0) {
      db.properties[idx] = { ...db.properties[idx], ...updates };
      saveDatabase();

      // Broadcast update to all clients
      broadcastSse('property_updated', { id, updates: db.properties[idx] });
      return res.json({ success: true, property: db.properties[idx] });
    }

    res.status(404).json({ success: false, error: 'العقار غير موجود' });
  });

  // DELETE Property
  app.delete('/api/properties/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = db.properties.length;
    db.properties = db.properties.filter((p) => p.id !== id);

    if (db.properties.length !== initialLen) {
      saveDatabase();
      broadcastSse('property_deleted', { id });
      return res.json({ success: true });
    }

    res.status(404).json({ success: false, error: 'العقار غير موجود' });
  });

  // GET Admin Notifications
  app.get('/api/notifications/admin', (_req: Request, res: Response) => {
    res.json(db.notifications);
  });

  // POST Admin Notification
  app.post('/api/notifications/admin', (req: Request, res: Response) => {
    const notif = req.body;
    if (notif && notif.title) {
      const exists = db.notifications.some(
        (n) => n.id === notif.id || (n.type === notif.type && n.message === notif.message && Date.now() - n.createdAt < 5000)
      );
      if (!exists) {
        db.notifications.unshift(notif);
        db.notifications = db.notifications.slice(0, 100);
        saveDatabase();
        broadcastSse('notification_added', notif);
      }
    }
    res.json({ success: true });
  });

  // PATCH Mark Notification Read
  app.patch('/api/notifications/admin/:id/read', (req: Request, res: Response) => {
    const { id } = req.params;
    const target = db.notifications.find((n) => n.id === id);
    if (target) {
      target.read = true;
      saveDatabase();
      broadcastSse('notification_updated', { id, read: true });
    }
    res.json({ success: true });
  });

  // PATCH Mark All Read
  app.patch('/api/notifications/admin/read-all', (_req: Request, res: Response) => {
    db.notifications.forEach((n) => (n.read = true));
    saveDatabase();
    broadcastSse('notification_updated', { allRead: true });
    res.json({ success: true });
  });

  // DELETE Notification
  app.delete('/api/notifications/admin/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    db.notifications = db.notifications.filter((n) => n.id !== id);
    saveDatabase();
    res.json({ success: true });
  });

  // POST Bookings
  app.post('/api/bookings', (req: Request, res: Response) => {
    const booking = req.body;
    db.bookings.unshift(booking);

    const notif: ServerAdminNotification = {
      id: `notif-book-${Date.now()}-${booking.propertyId}`,
      type: 'booking_request',
      title: 'طلب معاينة عقار جديد',
      message: `طلب معاينة لعقار "${booking.propertyTitle}" من العميل "${booking.clientName}" (${booking.clientPhone}) بتاريخ ${booking.date}.`,
      createdAt: Date.now(),
      read: false,
      linkType: 'bookings',
      propertyId: booking.propertyId,
      propertyTitle: booking.propertyTitle,
      userName: booking.clientName,
      userPhone: booking.clientPhone
    };
    db.notifications.unshift(notif);
    saveDatabase();

    broadcastSse('booking_added', { booking, notification: notif });
    res.json({ success: true });
  });

  const httpServer = http.createServer(app);

  // Mount Vite development middlewares
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`> Sakan Plus Multi-Device Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Start Error:', err);
  process.exit(1);
});
