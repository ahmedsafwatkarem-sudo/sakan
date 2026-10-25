import { Property, UserProfile, UserRole, AdminNotification, BookingRequest } from '../types';

// API base URL (relative for same origin)
const API_BASE = '/api';

export interface SyncEventPayload {
  type: 'user_registered' | 'user_updated' | 'user_deleted' | 'property_added' | 'property_updated' | 'property_deleted' | 'notification_added' | 'notification_updated' | 'booking_added';
  data: any;
  timestamp: number;
}

type SyncEventListener = (event: SyncEventPayload) => void;
const listeners = new Set<SyncEventListener>();

let sseSource: EventSource | null = null;
let reconnectTimer: any = null;

/**
 * Connect to Server-Sent Events stream for instant real-time synchronization across devices and IPs
 */
export function connectSyncStream(): () => void {
  if (typeof window === 'undefined') return () => {};

  if (sseSource) {
    return () => {};
  }

  function start() {
    try {
      sseSource = new EventSource(`${API_BASE}/sync/events`);

      sseSource.onmessage = (e) => {
        try {
          const payload: SyncEventPayload = JSON.parse(e.data);
          listeners.forEach((listener) => {
            try {
              listener(payload);
            } catch (err) {
              console.error('Error in sync listener:', err);
            }
          });
        } catch {
          // ignore heartbeats
        }
      };

      sseSource.onerror = () => {
        if (sseSource) {
          sseSource.close();
          sseSource = null;
        }
        // Auto reconnect after 3 seconds
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(start, 3000);
      };
    } catch (err) {
      console.warn('Could not establish SSE stream:', err);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(start, 5000);
    }
  }

  start();

  return () => {
    if (sseSource) {
      sseSource.close();
      sseSource = null;
    }
    clearTimeout(reconnectTimer);
  };
}

/**
 * Register a listener for real-time sync events from the server
 */
export function addSyncEventListener(listener: SyncEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Fetch all registered users from the shared server
 */
export async function apiFetchUsers(): Promise<UserProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('apiFetchUsers fallback to local:', err);
    return [];
  }
}

/**
 * Register a new user on the shared server
 */
export async function apiRegisterUser(userData: {
  phone: string;
  pass: string;
  name: string;
  role: UserRole;
}): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  try {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await res.json();
  } catch (err: any) {
    console.error('apiRegisterUser error:', err);
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * Login user via shared server
 */
export async function apiLoginUser(
  phone: string,
  pass: string
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pass })
    });
    return await res.json();
  } catch (err: any) {
    console.error('apiLoginUser error:', err);
    return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
  }
}

/**
 * Update user publishing permission on the shared server
 */
export async function apiUpdateUserPermission(
  uid: string,
  canPublish: boolean,
  publishingRequestStatus: 'approved' | 'rejected' | 'pending' | 'none'
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(uid)}/permission`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canPublish, publishingRequestStatus })
    });
    return await res.json();
  } catch (err: any) {
    console.error('apiUpdateUserPermission error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete user from the shared server
 */
export async function apiDeleteUser(
  uid: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(uid)}?phone=${encodeURIComponent(phone)}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err: any) {
    console.error('apiDeleteUser error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all properties from the shared server
 */
export async function apiFetchProperties(): Promise<Property[]> {
  try {
    const res = await fetch(`${API_BASE}/properties`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('apiFetchProperties fallback:', err);
    return [];
  }
}

/**
 * Add a property to the shared server
 */
export async function apiAddProperty(property: Omit<Property, 'id'>): Promise<{ success: boolean; id: string; property: Property }> {
  const res = await fetch(`${API_BASE}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(property)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Update property on the shared server
 */
export async function apiUpdateProperty(id: string, updates: Partial<Property>): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/properties/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return await res.json();
  } catch (err: any) {
    console.error('apiUpdateProperty error:', err);
    return { success: false };
  }
}

/**
 * Delete property on the shared server
 */
export async function apiDeleteProperty(id: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/properties/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err: any) {
    console.error('apiDeleteProperty error:', err);
    return { success: false };
  }
}

/**
 * Fetch admin notifications from the shared server
 */
export async function apiFetchAdminNotifications(): Promise<AdminNotification[]> {
  try {
    const res = await fetch(`${API_BASE}/notifications/admin`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('apiFetchAdminNotifications error:', err);
    return [];
  }
}

/**
 * Add admin notification on the shared server
 */
export async function apiAddAdminNotification(notif: AdminNotification): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif)
    });
  } catch (err) {
    console.warn('apiAddAdminNotification error:', err);
  }
}

/**
 * Mark admin notification as read on the shared server
 */
export async function apiMarkAdminNotificationRead(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/admin/${encodeURIComponent(id)}/read`, {
      method: 'PATCH'
    });
  } catch (err) {
    console.warn('apiMarkAdminNotificationRead error:', err);
  }
}

/**
 * Mark all admin notifications as read on the shared server
 */
export async function apiMarkAllAdminNotificationsRead(): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/admin/read-all`, {
      method: 'PATCH'
    });
  } catch (err) {
    console.warn('apiMarkAllAdminNotificationsRead error:', err);
  }
}

/**
 * Delete admin notification on the shared server
 */
export async function apiDeleteAdminNotification(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/admin/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('apiDeleteAdminNotification error:', err);
  }
}

/**
 * Add booking request to shared server
 */
export async function apiAddBooking(booking: BookingRequest): Promise<void> {
  try {
    await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });
  } catch (err) {
    console.warn('apiAddBooking error:', err);
  }
}
