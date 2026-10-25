export type PropertyType = 'sale' | 'rent';

export type PropertyCategory = 
  | 'apartment'
  | 'summer_apartment'
  | 'chalet'
  | 'villa' 
  | 'twinhouse'
  | 'townhouse'
  | 'duplex' 
  | 'penthouse'
  | 'studio'
  | 'building'
  | 'commercial' 
  | 'office_clinic'
  | 'warehouse'
  | 'factory'
  | 'land' 
  | 'agricultural_land'
  | 'commercial_land'
  | 'tourist_hotel'
  | 'resthouse';

export interface PropertyReview {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: number | string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: PropertyType;
  category: PropertyCategory;
  location: string;
  addressDetails?: string;
  bedrooms?: number;
  bathrooms?: number;
  area: number; // in square meters
  floor?: number | string;
  finishing?: 'super_lux' | 'ultra_lux' | 'lux' | 'semi_finished' | 'core_and_shell';
  images: string[];
  video?: string; // Video URL or video file Data URL for property tour
  contactPhone: string;
  whatsapp: string;
  ownerId?: string;
  ownerName?: string;
  status: 'active' | 'pending' | 'sold';
  createdAt: number | string;
  featured?: boolean;
  averageRating?: number;
  reviewsCount?: number;
  reviews?: PropertyReview[];
}

export type UserRole = 'client' | 'owner' | 'renter' | 'admin';

export interface UserProfile {
  uid: string;
  phone: string;
  email: string;
  role: UserRole;
  name?: string;
  status: 'active' | 'pending' | 'blocked';
  canPublish?: boolean; // Only true if master owner or approved by master owner
  publishingRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  preferences?: UserPreferences;
  createdAt?: string | number;
  lastActive?: string | number;
}

export interface UserPreferences {
  preferredCities: string[];
  preferredType?: 'all' | 'sale' | 'rent';
  notifyOnMatch?: boolean;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyCity?: string;
  propertyPrice?: number;
  propertyImage?: string;
  propertyType?: PropertyType;
  createdAt: number;
  read: boolean;
  matchReason?: string;
}

export interface BookingRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  clientName: string;
  clientPhone: string;
  date: string;
  notes?: string;
  createdAt: string | number;
}

export interface AdminNotification {
  id: string;
  type: 'new_user' | 'new_property' | 'publish_request' | 'booking_request' | 'review' | 'system';
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
  linkType?: 'users' | 'properties' | 'pending' | 'bookings';
  userId?: string;
  userName?: string;
  userPhone?: string;
  userRole?: string;
  propertyId?: string;
  propertyTitle?: string;
}
