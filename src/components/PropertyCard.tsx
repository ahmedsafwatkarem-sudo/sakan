import React from 'react';
import { MapPin, BedDouble, Bath, Maximize2, MessageCircle, Phone, ArrowUpRight, CheckCircle, Clock, Star, Film } from 'lucide-react';
import { Property, UserProfile } from '../types';
import { CATEGORY_LABELS } from '../data/mockProperties';

interface PropertyCardProps {
  property: Property;
  currentUser: UserProfile | null;
  onSelectProperty: (property: Property) => void;
  onDirectContactWhatsapp: (property: Property) => void;
  onRequireAuth?: (actionType: 'details' | 'whatsapp' | 'call', property: Property) => void;
  onToggleStatus?: (propertyId: string, newStatus: 'active' | 'sold' | 'pending') => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  currentUser,
  onSelectProperty,
  onDirectContactWhatsapp,
  onRequireAuth
}) => {
  const isRent = property.type === 'rent';
  const formattedPrice = Number(property.price).toLocaleString('ar-EG');
  const mainImage = property.images && property.images.length > 0 
    ? property.images[0] 
    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';

  const handleDetailsClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth('details', property);
        return;
      }
    }
    onSelectProperty(property);
  };

  const handleWhatsappClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth('whatsapp', property);
        return;
      }
    }
    onDirectContactWhatsapp(property);
  };

  const handleCallClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth('call', property);
        return;
      }
    }
    window.location.href = `tel:${property.contactPhone || '01007775402'}`;
  };

  const categoryArabic = CATEGORY_LABELS[property.category] || property.category;

  const isPending = property.status === 'pending';
  const isSold = property.status === 'sold';

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-400/50 transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 cursor-pointer" onClick={handleDetailsClick}>
        <img
          src={mainImage}
          alt={property.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition"></div>

        {/* Badges Top */}
        <div className="absolute top-3.5 right-3.5 flex flex-wrap gap-1.5 items-center z-10">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black shadow-md ${
              isRent ? 'bg-amber-500 text-slate-950' : 'bg-blue-950 text-white'
            }`}
          >
            {isRent ? 'للإيجار' : 'للبيع'}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-800 backdrop-blur-sm shadow-xs">
            {categoryArabic}
          </span>
          {property.featured && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs">
              مميز ★
            </span>
          )}
          {property.video && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 text-amber-300 backdrop-blur-sm shadow-xs flex items-center gap-1 border border-amber-400/30">
              <Film className="w-3 h-3 text-amber-400" />
              <span>فيديو</span>
            </span>
          )}
          {property.averageRating && property.averageRating > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-900 backdrop-blur-sm shadow-xs flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              <span className="font-mono">{property.averageRating.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500">({property.reviewsCount || property.reviews?.length || 0})</span>
            </span>
          )}
        </div>

        {/* Status indicator if not active */}
        {isPending && (
          <div className="absolute top-3.5 left-3.5 bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md">
            <Clock className="w-3 h-3" />
            <span>قيد المراجعة</span>
          </div>
        )}
        {isSold && (
          <div className="absolute top-3.5 left-3.5 bg-rose-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md">
            <CheckCircle className="w-3 h-3" />
            <span>{isRent ? 'تم التأجير' : 'تم البيع'}</span>
          </div>
        )}

        {/* Price tag on image */}
        <div className="absolute bottom-3 right-3 text-white z-10">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-amber-300 drop-shadow-md font-mono">
              {formattedPrice}
            </span>
            <span className="text-xs font-bold text-slate-200">
              ج.م {isRent && <span className="text-[10px] text-amber-200">/ شهرياً</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>

          {/* Title */}
          <h3
            onClick={handleDetailsClick}
            className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-950 transition line-clamp-1 cursor-pointer"
            title={property.title}
          >
            {property.title}
          </h3>

          {/* Description snippet */}
          <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {property.description}
          </p>

          {/* Spec Badges */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 font-semibold">
            {property.area && (
              <div className="flex items-center gap-1" title="المساحة">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.area} م²</span>
              </div>
            )}
            {property.bedrooms !== undefined && (
              <div className="flex items-center gap-1" title="غرف النوم">
                <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.bedrooms} غرف</span>
              </div>
            )}
            {property.bathrooms !== undefined && (
              <div className="flex items-center gap-1" title="الحمامات">
                <Bath className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.bathrooms} حمام</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
          {/* Details Button */}
          <button
            type="button"
            onClick={handleDetailsClick}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span>التفاصيل</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* WhatsApp Direct Action */}
          <button
            type="button"
            onClick={handleWhatsappClick}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 active:scale-95"
            title="تواصل مباشر عبر واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
            <span>واتساب</span>
          </button>

          {/* Call direct */}
          <button
            type="button"
            onClick={handleCallClick}
            className="p-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl transition flex items-center justify-center active:scale-95"
            title="اتصال هاتفي"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
