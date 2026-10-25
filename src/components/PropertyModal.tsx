import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Maximize2, 
  BedDouble, 
  Bath, 
  Phone, 
  MessageCircle, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Building, 
  Layers, 
  Sparkles,
  Share2,
  Star,
  MessageSquare,
  User,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Video,
  Film,
  Play,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { Property, UserProfile, PropertyReview } from '../types';
import { CATEGORY_LABELS } from '../data/mockProperties';
import { formatVideoDetails } from '../utils/mediaUtils';

interface PropertyModalProps {
  property: Property | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onRequestBooking: (booking: {
    propertyId: string;
    propertyTitle: string;
    clientName: string;
    clientPhone: string;
    date: string;
    notes?: string;
  }) => void;
  onAddReview?: (propertyId: string, rating: number, comment: string) => void;
  onOpenAuth?: () => void;
  onRequireAuth?: (actionType: 'details' | 'whatsapp' | 'call' | 'booking') => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PropertyModal: React.FC<PropertyModalProps> = ({
  property,
  currentUser,
  onClose,
  onRequestBooking,
  onAddReview,
  onOpenAuth,
  onRequireAuth,
  onShowToast
}) => {
  if (!property) return null;

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [clientName, setClientName] = useState(currentUser?.name || '');
  const [clientPhone, setClientPhone] = useState(currentUser?.phone || '');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  // Review Form state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const images = property.images && property.images.length > 0
    ? property.images
    : ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'];

  // Unified Media Gallery Items combining Photos and Video
  const mediaItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'image' | 'video';
      url: string;
      title: string;
      subtitle?: string;
      badge?: string;
      isCover?: boolean;
    }> = [];

    // If property has video, include it in the integrated list
    if (property.video) {
      items.push({
        id: 'media-video',
        type: 'video',
        url: property.video,
        title: 'فيديو تفقد العقار والجولة الافتراضية',
        subtitle: formatVideoDetails(property.video).sourceLabel,
        badge: '🎥 فيديو تفصيلي'
      });
    }

    images.forEach((img, idx) => {
      items.push({
        id: `media-img-${idx}`,
        type: 'image',
        url: img,
        title: idx === 0 ? 'صورة الغلاف الرئيسية' : `صورة المعاينة ${idx + 1}`,
        subtitle: idx === 0 ? 'الغلاف المعتمد' : `صورة ${idx + 1}`,
        badge: idx === 0 ? '🌟 الغلاف' : undefined,
        isCover: idx === 0
      });
    });

    return items;
  }, [property.video, images]);

  const currentMediaIndex = Math.min(activeMediaIndex, Math.max(0, mediaItems.length - 1));
  const currentMedia = mediaItems[currentMediaIndex] || mediaItems[0];
  const videoDetails = property.video ? formatVideoDetails(property.video) : null;
  const firstPhotoIndex = property.video ? 1 : 0;
  const isViewingVideo = currentMedia?.type === 'video';

  const handlePrevMedia = () => {
    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const handleNextMedia = () => {
    setActiveMediaIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const categoryName = CATEGORY_LABELS[property.category] || property.category;
  const isRent = property.type === 'rent';
  const formattedPrice = Number(property.price).toLocaleString('ar-EG');
  const targetWhatsapp = property.whatsapp || '201007775402';
  const targetPhone = property.contactPhone || '01007775402';

  const whatsappMessage = encodeURIComponent(
    `مرحباً سكن بلس، أود الاستفسار ومعاينة عقار: "${property.title}" (كود: ${property.id}) المعروض بسعر ${formattedPrice} ج.م`
  );
  const whatsappUrl = `https://wa.me/${targetWhatsapp}?text=${whatsappMessage}`;

  const reviewsList = property.reviews || [];
  const currentAvgRating = property.averageRating || (
    reviewsList.length > 0 
      ? Number((reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1))
      : 5.0
  );

  const userExistingReview = currentUser && reviewsList.length > 0
    ? reviewsList.find(r => r.userId === currentUser.uid || (r.userPhone && r.userPhone === currentUser.phone))
    : null;

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onRequireAuth) {
        onRequireAuth('booking');
      } else if (onOpenAuth) {
        onOpenAuth();
      }
      return;
    }
    if (!clientPhone) {
      onShowToast('يرجى إدخال رقم الهاتف للتواصل', 'error');
      return;
    }
    setIsSubmittingBooking(true);

    setTimeout(() => {
      onRequestBooking({
        propertyId: property.id,
        propertyTitle: property.title,
        clientName: clientName || 'عميل سكن بلس',
        clientPhone,
        date: inspectionDate || 'في أقرب وقت ممكن',
        notes: inspectionNotes
      });
      setIsSubmittingBooking(false);
      setBookingSubmitted(true);
      onShowToast('تم إرسال طلب المعاينة بنجاح! سيتواصل معك ممثل سكن بلس قريباً', 'success');
    }, 600);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onShowToast('يرجى تسجيل الدخول أولاً لإضافة تقييمك ورأيك', 'info');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!reviewComment.trim()) {
      onShowToast('يرجى كتابة تعليق قصير عن العقار', 'error');
      return;
    }

    if (reviewComment.trim().length < 3) {
      onShowToast('التعليق قصير جداً، يرجى كتابة رأيك بشكل أوضح', 'error');
      return;
    }

    setIsSubmittingReview(true);
    if (onAddReview) {
      onAddReview(property.id, rating, reviewComment.trim());
      setReviewComment('');
      onShowToast('شكراً لك! تم نشر تقييمك ورأيك بنجاح.', 'success');
    }
    setIsSubmittingReview(false);
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?property=${encodeURIComponent(property.id)}`
    : '';

  const handleCopyLink = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
    }
    onShowToast('تم نسخ رابط العقار للمشاركة (مرفقاً بصورة العقار وبياناته)', 'success');
  };

  const handleShareWhatsapp = () => {
    const text = encodeURIComponent(
      `🏡 تفقد هذا العقار على سكن بلس: "${property.title}" في ${property.location} بسعر ${Number(property.price).toLocaleString()} ج.م\nتفاصيل وصور العقار:\n${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Synchronize document title, OpenGraph image, and URL when property is viewed
  useEffect(() => {
    if (!property) return;
    const originalTitle = document.title;
    const propertyTitle = `${property.title} | سكن بلس`;
    document.title = propertyTitle;

    const setMetaTag = (attr: string, key: string, content: string) => {
      let meta = document.querySelector(`meta[${attr}="${key}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, key);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const mainImage = property.images && property.images.length > 0
      ? property.images[0]
      : `${window.location.origin}/og-banner.jpg`;

    const fullImageUrl = mainImage.startsWith('http') || mainImage.startsWith('data:')
      ? mainImage
      : `${window.location.origin}${mainImage.startsWith('/') ? '' : '/'}${mainImage}`;

    const desc = `${property.title} - ${property.location} - السعر: ${Number(property.price).toLocaleString()} ج.م. تصفح صور ومعلومات العقار على سكن بلس.`;

    setMetaTag('property', 'og:title', propertyTitle);
    setMetaTag('property', 'og:description', desc);
    setMetaTag('property', 'og:image', fullImageUrl);
    setMetaTag('property', 'og:image:secure_url', fullImageUrl);
    setMetaTag('property', 'og:url', shareUrl);
    setMetaTag('name', 'twitter:title', propertyTitle);
    setMetaTag('name', 'twitter:description', desc);
    setMetaTag('name', 'twitter:image', fullImageUrl);

    try {
      window.history.replaceState(null, '', `?property=${encodeURIComponent(property.id)}`);
    } catch {
      // ignore
    }

    return () => {
      document.title = originalTitle;
      const defaultBanner = `${window.location.origin}/og-banner.jpg`;
      const defaultDesc = 'منصة سكن بلس العقارية لبيع وشراء وتأجير العقارات والوحدات السكنية والتجارية مع التواصل المباشر عبر واتساب 01007775402.';
      setMetaTag('property', 'og:title', 'سكن بلس | Sakan Plus - سكن المستقبل يبدأ من هنا');
      setMetaTag('property', 'og:description', defaultDesc);
      setMetaTag('property', 'og:image', defaultBanner);
      setMetaTag('property', 'og:image:secure_url', defaultBanner);
      setMetaTag('property', 'og:url', window.location.origin);
      setMetaTag('name', 'twitter:title', 'سكن بلس | Sakan Plus - سكن المستقبل يبدأ من هنا');
      setMetaTag('name', 'twitter:description', defaultDesc);
      setMetaTag('name', 'twitter:image', defaultBanner);
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        // ignore
      }
    };
  }, [property.id, shareUrl]);

  const finishingLabels: Record<string, string> = {
    ultra_lux: 'ألترا سوبر لوكس',
    super_lux: 'سوبر لوكس',
    lux: 'لوكس',
    semi_finished: 'نصف تشطيب (محارة وحلوق)',
    core_and_shell: 'بدون تشطيب (طوب أحمر)'
  };

  const ratingDescriptions: Record<number, string> = {
    1: 'نجمة واحدة - ضعيف',
    2: 'نجمتان - مقبول',
    3: '3 نجوم - جيد',
    4: '4 نجوم - جيد جداً',
    5: '5 نجوم - ممتاز'
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col my-auto relative">
        
        {/* Header bar */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                isRent ? 'bg-amber-500 text-slate-950' : 'bg-blue-950 text-white'
              }`}
            >
              {isRent ? 'عقار للإيجار' : 'عقار للبيع'}
            </span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-mono">
              كود: {property.id}
            </span>
            {reviewsList.length > 0 && (
              <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>{currentAvgRating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({reviewsList.length} تقييم)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShareWhatsapp}
              className="px-2.5 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition flex items-center gap-1 text-xs font-bold"
              title="مشاركة العقار وصورته عبر واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">مشاركة واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1 text-xs font-bold"
              title="نسخ رابط العقار لمشاركته في المواقع الأخرى بصورة المعاينة"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">نسخ الرابط</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              aria-label="إغلاق"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Main Integrated Media Gallery (Photos + Video Tour) */}
          <div className="space-y-3">
            {/* Gallery Toolbar: Filter tabs and Fullscreen */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveMediaIndex(0)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeMediaIndex === 0 && !property.video
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>معرض الوسائط ({mediaItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMediaIndex(firstPhotoIndex)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    !isViewingVideo
                      ? 'bg-blue-950 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>📸 الصور ({images.length})</span>
                </button>

                {property.video && (
                  <button
                    type="button"
                    onClick={() => setActiveMediaIndex(0)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs ${
                      isViewingVideo
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>🎥 فيديو الجولة ({videoDetails?.sourceLabel})</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                title="عرض بكامل الشاشة"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>تكبير</span>
              </button>
            </div>

            {/* Viewer: Either Active Video or Active Photo */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 shadow-lg group">
              {isViewingVideo ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  {videoDetails?.isIframe ? (
                    <iframe
                      src={videoDetails.embedUrl}
                      title="فيديو تفقد العقار والجولة الافتراضية"
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : (
                    <video
                      src={currentMedia.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  )}

                  {/* Video Overlay Top Badge */}
                  <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md pointer-events-none">
                    <Film className="w-3.5 h-3.5" />
                    <span>جولة فيديو تفقدية ({videoDetails?.sourceLabel})</span>
                  </div>

                  {/* Switch to photos quick button */}
                  <button
                    type="button"
                    onClick={() => setActiveMediaIndex(firstPhotoIndex)}
                    className="absolute top-3 left-3 bg-black/70 hover:bg-black text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md shadow-md transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>عرض ألبوم الصور ({images.length})</span>
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={currentMedia.url}
                    alt={currentMedia.title}
                    className="w-full h-full object-cover transition-transform duration-300"
                  />

                  {/* Cover Badge */}
                  {currentMedia.isCover && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      <span>الغلاف الرئيسي</span>
                    </div>
                  )}

                  {/* Quick Video Launcher button directly on photo */}
                  {property.video && (
                    <button
                      type="button"
                      onClick={() => setActiveMediaIndex(0)}
                      className="absolute bottom-3 right-3 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg backdrop-blur-md active:scale-95 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                      <span>تشغيل فيديو الجولة 🎥</span>
                    </button>
                  )}

                  {/* Counter Badge */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1">
                    <span>{currentMediaIndex + 1}</span>
                    <span>/</span>
                    <span>{mediaItems.length}</span>
                  </div>
                </div>
              )}

              {/* Navigation Chevrons (Cycling across photos and video) */}
              {mediaItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevMedia();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center transition shadow-lg backdrop-blur-sm"
                    aria-label="السابق"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextMedia();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center transition shadow-lg backdrop-blur-sm"
                    aria-label="التالي"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Unified Media Thumbnail Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
              {mediaItems.map((item, idx) => {
                const isActive = currentMediaIndex === idx;
                const isItemVideo = item.type === 'video';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                      isActive
                        ? 'border-amber-500 ring-2 ring-amber-400/50 scale-105 shadow-md'
                        : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                    }`}
                    title={item.title}
                  >
                    {isItemVideo ? (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative text-amber-400">
                        <Play className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-[9px] font-black text-white mt-0.5">فيديو 🎥</span>
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      </div>
                    ) : (
                      <div className="w-full h-full relative">
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                        {item.isCover && (
                          <span className="absolute top-0.5 right-0.5 bg-amber-500 text-slate-950 text-[8px] font-black px-1 rounded">
                            غلاف
                          </span>
                        )}
                        <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] px-1 rounded font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Price Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>{property.location}</span>
                {property.addressDetails && (
                  <span className="text-slate-400">• {property.addressDetails}</span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {property.title}
              </h2>
            </div>

            <div className="text-right md:text-left shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="text-xs font-bold text-slate-500 mb-0.5">السعر المطلوب</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
                  {formattedPrice}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  ج.م {isRent && <span className="text-xs text-slate-500">/ شهرياً</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Key Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-bold">المساحة الإجمالية</div>
                <div className="text-sm font-black text-slate-900">{property.area} م²</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-bold">غرف النوم</div>
                <div className="text-sm font-black text-slate-900">{property.bedrooms ?? '-'} غرف</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
                <Bath className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-bold">دورات المياه</div>
                <div className="text-sm font-black text-slate-900">{property.bathrooms ?? '-'} حمامات</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-bold">نوع العقار</div>
                <div className="text-sm font-black text-slate-900">{categoryName}</div>
              </div>
            </div>
          </div>

          {/* Secondary specs */}
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-4 rounded-2xl">
            {property.floor && (
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>الدور: <strong>{property.floor}</strong></span>
              </div>
            )}
            {property.finishing && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>التشطيب: <strong>{finishingLabels[property.finishing] || property.finishing}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-emerald-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>عقار موثق ومفحوص من سكن بلس</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-base font-black text-slate-900 mb-2">وصف وتفاصيل العقار</h4>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              {property.description}
            </div>
          </div>

          {/* Direct Contact Actions Box */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-right sm:text-right">
              <div className="text-xs text-amber-300 font-bold mb-1">تواصل مع معلن العقار أو إدارة سكن بلس</div>
              <div className="text-lg font-black font-mono tracking-wider">{targetPhone}</div>
              <div className="text-[11px] text-slate-300 mt-0.5">متاح طوال اليوم للرد على الاستفسارات وترتيب المعاينات</div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    if (onRequireAuth) {
                      onRequireAuth('whatsapp');
                    } else if (onOpenAuth) {
                      onOpenAuth();
                    }
                    return;
                  }
                  window.open(whatsappUrl, '_blank');
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg transition active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>محادثة واتساب</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    if (onRequireAuth) {
                      onRequireAuth('call');
                    } else if (onOpenAuth) {
                      onOpenAuth();
                    }
                    return;
                  }
                  window.location.href = `tel:${targetPhone}`;
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-blue-950 px-5 py-3 rounded-2xl text-xs font-black shadow-lg transition active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>اتصال هاتفي</span>
              </button>
            </div>
          </div>

          {/* RATINGS & REVIEWS SECTION */}
          <div className="border border-slate-200 rounded-3xl p-5 sm:p-6 bg-slate-50/70 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">تقييمات وآراء العملاء</h4>
                  <p className="text-xs text-slate-500">
                    تقييمات معتمدة من المستخدمين والعملاء الذين عاينوا العقار
                  </p>
                </div>
              </div>

              {/* Average Rating Score */}
              <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto">
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {currentAvgRating.toFixed(1)}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(currentAvgRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 fill-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                    {reviewsList.length} {reviewsList.length === 1 ? 'تقييم' : 'تقييمات'}
                  </div>
                </div>
              </div>
            </div>

            {/* Add Review Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h5 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-900" />
                <span>{userExistingReview ? 'تحديث تقييمك للعقار' : 'أضف تقييمك ورأيك في العقار'}</span>
              </h5>

              {currentUser ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {/* Interactive Star Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      حدد تقييمك (من 1 إلى 5 نجوم):
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 text-slate-300 hover:scale-125 transition duration-150 focus:outline-none"
                            title={`${star} نجوم`}
                          >
                            <Star
                              className={`w-7 h-7 cursor-pointer transition ${
                                star <= (hoverRating || rating)
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-200 fill-slate-100'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl">
                        {ratingDescriptions[hoverRating || rating]}
                      </span>
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اكتب تعليقك أو انطباعك عن العقار والموقع
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="مثال: العقار متميز جداً وتشطيبه عالي، الموقع هادئ وقريب من الخدمات وسهولة في التواصل..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                    ></textarea>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">
                      سيظهر اسمك ({currentUser.name || currentUser.phone}) مع التقييم.
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {isSubmittingReview ? 'جاري الإرسال...' : 'نشر التقييم والتعليق'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <LogIn className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>يجب تسجيل الدخول كعميل مسجل في سكن بلس لتتمكن من تقييم العقار وكتابة تعليق.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="shrink-0 bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs transition"
                  >
                    دخول لتقييم العقار
                  </button>
                </div>
              )}
            </div>

            {/* Existing Reviews List */}
            <div className="space-y-3">
              <h5 className="font-black text-slate-900 text-xs text-slate-600">
                الآراء المكتوبة ({reviewsList.length}):
              </h5>

              {reviewsList.length === 0 ? (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-bold">
                  لا توجد تعليقات أو تقييمات مكتوبة حتى الآن. كن أول من يقيّم هذا العقار!
                </div>
              ) : (
                reviewsList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-950/10 text-blue-950 flex items-center justify-center font-bold text-xs">
                          {rev.userName ? rev.userName.charAt(0) : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">{rev.userName}</span>
                            {currentUser && (rev.userId === currentUser.uid || rev.userPhone === currentUser.phone) && (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                تقييمك
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(rev.createdAt).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5 text-amber-400 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 fill-slate-100'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-mono font-bold text-amber-900 mr-1">
                          {rev.rating}.0
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed pr-10">
                      {rev.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inspection Booking Section */}
          <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/70">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <h4 className="font-black text-slate-900 text-base">حجز موعد معاينة ميدانية</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingForm(!showBookingForm)}
                className="text-xs text-blue-900 hover:underline font-bold"
              >
                {showBookingForm ? 'إخفاء النموذج' : 'طلب معاينة الآن'}
              </button>
            </div>

            {bookingSubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-sm flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-black">تم تسجيل طلب المعاينة بنجاح!</div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    سيتصل بك مستشارنا العقاري على الرقم ({clientPhone}) لتأكيد موعد المعاينة.
                  </div>
                </div>
              </div>
            ) : showBookingForm ? (
              <form onSubmit={handleBookingSubmit} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكريم</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="اسمك بالكامل"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف للتواصل</label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="مثال: 01007775402"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ المفضل للمعاينة</label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات أو أسئلة إضافية</label>
                  <textarea
                    rows={2}
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="أي استفسار يخص طريقة الدفع، التسليم، أو موعد المعاينة المناسب..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="w-full bg-blue-950 hover:bg-blue-900 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingBooking ? 'جاري إرسال الطلب...' : 'تأكيد حجز المعاينة'}
                </button>
              </form>
            ) : (
              <p className="text-xs text-slate-500">
                هل يعجبك هذا العقار؟ اضغط على زر "طلب معاينة الآن" لتحديد موعد زيارة العقار والتأكد من كافة تفاصيله على أرض الواقع.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal for Photos & Video Tour */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-xl flex flex-col p-3 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Header */}
          <div 
            className="flex items-center justify-between text-white pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-400">
                {currentMedia.title}
              </span>
              <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full font-mono text-slate-300">
                {currentMediaIndex + 1} / {mediaItems.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="إغلاق (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Main Stage */}
          <div 
            className="flex-1 relative flex items-center justify-center py-4 max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {isViewingVideo ? (
              <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center">
                {videoDetails?.isIframe ? (
                  <iframe
                    src={videoDetails.embedUrl}
                    title="فيديو العقار ملء الشاشة"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <video
                    src={currentMedia.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={currentMedia.url}
                  alt={currentMedia.title}
                  className="max-w-full max-h-[78vh] object-contain rounded-2xl shadow-2xl"
                />
              </div>
            )}

            {/* Lightbox Nav Chevrons */}
            {mediaItems.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevMedia}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center transition shadow-2xl backdrop-blur-md"
                  aria-label="السابق"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMedia}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center transition shadow-2xl backdrop-blur-md"
                  aria-label="التالي"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Strip */}
          <div 
            className="flex items-center justify-center gap-2 overflow-x-auto pt-2 max-w-4xl mx-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaItems.map((item, idx) => {
              const isActive = currentMediaIndex === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMediaIndex(idx)}
                  className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                    isActive
                      ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                      : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-amber-400">
                      <Play className="w-4 h-4 fill-amber-400" />
                      <span className="text-[8px] font-bold text-white">فيديو</span>
                    </div>
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
