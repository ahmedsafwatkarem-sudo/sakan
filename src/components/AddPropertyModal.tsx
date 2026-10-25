import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  Upload, 
  Sparkles, 
  Building2, 
  MapPin, 
  DollarSign, 
  Image as ImageIcon, 
  Camera, 
  ImagePlus, 
  Trash2, 
  Star, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Video, 
  Film, 
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Property, PropertyCategory, PropertyType, UserProfile } from '../types';
import { CATEGORY_LABELS, SAMPLE_IMAGES } from '../data/mockProperties';
import { formatVideoDetails } from '../utils/mediaUtils';
import { 
  EGYPT_GOVERNORATES, 
  DEFAULT_GOVERNORATE, 
  DEFAULT_CITY, 
  getCitiesForGovernorate 
} from '../data/egyptLocations';
import { MASTER_OWNER_PHONE, isMasterAdmin } from '../firebase';

interface AddPropertyModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onAddProperty: (propertyData: Omit<Property, 'id'>) => Promise<void>;
  onRequestPublishingPermission?: (userId: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  currentUser,
  onClose,
  onAddProperty,
  onRequestPublishingPermission,
  onShowToast
}) => {
  const isMaster = currentUser ? isMasterAdmin(currentUser.phone) : false;
  const canPublishDirectly = isMaster || currentUser?.canPublish === true;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [type, setType] = useState<PropertyType>('sale');
  const [category, setCategory] = useState<PropertyCategory>('summer_apartment');
  
  // Governorate and City: Default fixed to Kafr El Sheikh & Baltim Resort
  const [governorate, setGovernorate] = useState<string>(DEFAULT_GOVERNORATE);
  const [city, setCity] = useState<string>(DEFAULT_CITY);

  const handleGovernorateChange = (newGov: string) => {
    setGovernorate(newGov);
    const available = getCitiesForGovernorate(newGov);
    if (newGov === DEFAULT_GOVERNORATE) {
      setCity(DEFAULT_CITY);
    } else {
      setCity(available[0] || '');
    }
  };

  const [addressDetails, setAddressDetails] = useState('');
  const [area, setArea] = useState<number | ''>('');
  const [bedrooms, setBedrooms] = useState<number | ''>(3);
  const [bathrooms, setBathrooms] = useState<number | ''>(2);
  const [floor, setFloor] = useState('2');
  const [finishing, setFinishing] = useState<'super_lux' | 'ultra_lux' | 'lux' | 'semi_finished' | 'core_and_shell'>('super_lux');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [selectedImages, setSelectedImages] = useState<string[]>([SAMPLE_IMAGES[0].url]);
  
  // Video Tour Support (direct upload or camera recording)
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [showSampleGallery, setShowSampleGallery] = useState(false);
  const [hasRequestedPermission, setHasRequestedPermission] = useState(currentUser?.publishingRequestStatus === 'pending');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);

  // Compress image to crisp Web-optimized JPEG Data URL (~100-200KB)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 960;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('فشل تحميل الصورة'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (files: FileList | null, isCamera = false) => {
    if (!files || files.length === 0) return;
    setIsProcessingImages(true);
    try {
      const promises: Promise<string>[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          promises.push(compressImage(file));
        }
      }
      const compressedImages = await Promise.all(promises);
      if (compressedImages.length > 0) {
        setSelectedImages((prev) => [...compressedImages, ...prev]);
        onShowToast(
          isCamera
            ? 'تم التقاط الصورة بنجاح وإضافتها للعقار!'
            : `تم رفع ومعالجة ${compressedImages.length} صورة بنجاح!`,
          'success'
        );
      }
    } catch (err) {
      console.error(err);
      onShowToast('حدث خطأ أثناء معالجة الصور، يرجى المحاولة بصيغة أخرى', 'error');
    } finally {
      setIsProcessingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleVideoSelected = (files: FileList | null, isCamera = false) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      onShowToast('يرجى اختيار ملف فيديو صالح بصيغة (MP4, WebM, MOV)', 'error');
      return;
    }
    // Limit to 100MB
    if (file.size > 100 * 1024 * 1024) {
      onShowToast('حجم الفيديو كبير، يرجى اختيار فيديو بحجم أقل من 100 ميجابايت', 'error');
      return;
    }

    setIsProcessingVideo(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setVideoUrl(result);
      setIsProcessingVideo(false);
      onShowToast(isCamera ? 'تم تصوير وحفظ فيديو العقار بنجاح!' : 'تم رفع فيديو العقار بنجاح!', 'success');
    };
    reader.onerror = () => {
      setIsProcessingVideo(false);
      onShowToast('حدث خطأ أثناء قراءة ملف الفيديو', 'error');
    };
    reader.readAsDataURL(file);
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    if (videoCameraInputRef.current) videoCameraInputRef.current.value = '';
  };



  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setSelectedImages((prev) => {
      const target = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [target, ...rest];
    });
    onShowToast('تم تعيين الصورة كغلاف رئيسي للعقار', 'success');
  };

  const handleRemoveImage = (index: number) => {
    if (selectedImages.length === 1) {
      onShowToast('يجب الاحتفاظ بصورة واحدة على الأقل للعقار', 'info');
      return;
    }
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
    onShowToast('تمت إزالة الصورة', 'info');
  };

  const handleToggleSampleImage = (url: string) => {
    if (selectedImages.includes(url)) {
      if (selectedImages.length === 1) {
        onShowToast('يجب الاحتفاظ بصورة واحدة على الأقل للعقار', 'info');
        return;
      }
      setSelectedImages(selectedImages.filter(img => img !== url));
    } else {
      setSelectedImages([...selectedImages, url]);
    }
  };


  const handleRequestPermissionClick = async () => {
    if (!currentUser) return;
    if (onRequestPublishingPermission) {
      await onRequestPublishingPermission(currentUser.uid);
    }
    setHasRequestedPermission(true);
    onShowToast('تم إرسال طلب صلاحية النشر للمالك الأساسي للموافقة عليه من لوحة التحكم.', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      onShowToast('يرجى إدخال عنوان العقار', 'error');
      return;
    }
    if (!price || Number(price) <= 0) {
      onShowToast('يرجى إدخال سعر صحيح للعقار', 'error');
      return;
    }
    if (!area || Number(area) <= 0) {
      onShowToast('يرجى إدخال مساحة العقار بالمتر المربع', 'error');
      return;
    }
    if (!contactPhone.trim()) {
      onShowToast('يرجى إدخال رقم الهاتف للتواصل والواتساب', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = contactPhone.replace(/[^0-9]/g, '');
      const whatsapp = cleanPhone.startsWith('2') ? cleanPhone : `2${cleanPhone}`;

      // If user does not have permission granted by owner, status MUST be 'pending'
      const status = canPublishDirectly ? 'active' : 'pending';

      const propertyData: Omit<Property, 'id'> = {
        title: title.trim(),
        description: description.trim() || 'عقار متميز معروض عبر منصة سكن بلس بكامل المواصفات والخدمات.',
        price: Number(price),
        type,
        category,
        location: `${city}، ${governorate}`,
        addressDetails: addressDetails.trim() || undefined,
        area: Number(area),
        bedrooms: bedrooms !== '' ? Number(bedrooms) : undefined,
        bathrooms: bathrooms !== '' ? Number(bathrooms) : undefined,
        floor: floor || undefined,
        finishing,
        images: selectedImages.length > 0 ? selectedImages : [SAMPLE_IMAGES[0].url],
        video: videoUrl.trim() || undefined,
        contactPhone: contactPhone.trim(),
        whatsapp,
        ownerId: currentUser?.uid || 'guest-owner',
        ownerName: currentUser?.name || currentUser?.phone || 'معلن سكن بلس',
        status,
        createdAt: Date.now(),
        featured: isMaster
      };

      await onAddProperty(propertyData);

      if (canPublishDirectly) {
        onShowToast('تم نشر العقار بنجاح في سكن بلس (حساب مصرح له بالنشر)!', 'success');
      } else {
        onShowToast('تم إرسال العقار للمالك الأساسي للموافقة على النشر واعتماده.', 'info');
      }

      onClose();
    } catch (err) {
      console.error(err);
      onShowToast('حدث خطأ أثناء حفظ العقار، يرجى المحاولة مرة أخرى', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col my-auto relative">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">
                {canPublishDirectly ? 'إضافة عقار جديد' : 'طلب إضافة عقار للمراجعة'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {canPublishDirectly 
                  ? 'لديك صلاحية النشر المباشر المعتمدة من المالك' 
                  : 'سيتم مراجعة العقار واعتماد نشره من قبل المالك الأساسي'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {!canPublishDirectly && (
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed">
                <span className="font-black block text-sm mb-1 text-amber-900">
                  ملاحظة هامة: اعتماد ونشر العقارات يخضع لموافقة المالك الأساسي
                </span>
                سيتم إرسال هذا العقار فوراً إلى لوحة تحكم المالك الأساسي للمنصة (المهندس عبدالله شحاتة). لن يظهر العقار للزوار والجمهور إلا بعد قيام المالك باعتماده وموافقته على النشر أو منحك تصريح النشر المباشر.
              </div>
            </div>
          )}

          {/* Transaction Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">نوع العملية</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('sale')}
                className={`py-3 rounded-2xl font-black text-xs transition border flex items-center justify-center gap-2 ${
                  type === 'sale'
                    ? 'bg-blue-950 text-white border-blue-950 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>عقار للبيع</span>
              </button>
              <button
                type="button"
                onClick={() => setType('rent')}
                className={`py-3 rounded-2xl font-black text-xs transition border flex items-center justify-center gap-2 ${
                  type === 'rent'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>عقار للإيجار</span>
              </button>
            </div>
          </div>

          {/* Property Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان الإعلان <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: فيلا راقية للبيع بالتجمع الخامس تشطيب ألترا لوكس"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
            />
          </div>

          {/* Category & Egypt Locations Grid: فئة العقار -> المحافظة -> المركز او المدينة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. فئة العقار */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                فئة العقار <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PropertyCategory)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none cursor-pointer"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  if (key === 'all') return null;
                  return (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. المحافظة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المحافظة <span className="text-rose-500">*</span>
              </label>
              <select
                value={governorate}
                onChange={(e) => handleGovernorateChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none cursor-pointer"
              >
                {EGYPT_GOVERNORATES.map((gov) => (
                  <option key={gov.name} value={gov.name}>
                    محافظة {gov.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. المركز او المدينة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المركز او المدينة <span className="text-rose-500">*</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none cursor-pointer"
              >
                {getCitiesForGovernorate(governorate).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              العنوان التفصيلي / الشارع / المنطقة
            </label>
            <input
              type="text"
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              placeholder="مثال: اسم الحي أو الشارع، رقم العمارة، بجوار المعالم الرئيسية"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
            />
          </div>

          {/* Price & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                السعر المطلـوب (ج.م) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={type === 'sale' ? 'مثال: 5000000' : 'مثال: 30000'}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                />
                <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">
                  ج.م {type === 'rent' && '/ شهر'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المساحة (متر مربع م²) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: 220"
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                />
                <span className="absolute left-3 top-3 text-xs text-slate-400 font-bold">م²</span>
              </div>
            </div>
          </div>

          {/* Specs: Rooms, Baths, Floor, Finishing */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">غرف النوم</label>
              <input
                type="number"
                min="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">دورات المياه</label>
              <input
                type="number"
                min="0"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الدور / الطابق</label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="مثال: أرضي بحديقة"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">مستوى التشطيب</label>
              <select
                value={finishing}
                onChange={(e) => setFinishing(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="ultra_lux">ألترا سوبر لوكس</option>
                <option value="super_lux">سوبر لوكس</option>
                <option value="lux">لوكس</option>
                <option value="semi_finished">نصف تشطيب</option>
                <option value="core_and_shell">طوب أحمر</option>
              </select>
            </div>
          </div>

          {/* Contact Phone & WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم هاتف التواصل وواتساب <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="مثال: 01007775402"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل ومواصفات العقار</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب مواصفات العقار المميزة، الإطلالة، الخدمات المحيطة، طريقة السداد..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
            ></textarea>
          </div>

          {/* Photos Selection & Camera */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            {/* Hidden photo file & camera inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files, false)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files, true)}
            />

            {/* Hidden video file & camera inputs */}
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleVideoSelected(e.target.files, false)}
            />
            <input
              ref={videoCameraInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleVideoSelected(e.target.files, true)}
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <span>معرض الوسائط والمعاينة (الصور وفيديوهات العقار)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  أضف ألبوم صور وفيديو جولة تفقدية بالرفع المباشر أو التصوير لزيادة سرعة بيع أو تأجير عقارك
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {videoUrl ? (
                  <span className="text-[11px] text-emerald-800 font-extrabold bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>فيديو العقار جاهز</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Film className="w-3 h-3 text-slate-400" />
                    <span>فيديو (اختياري)</span>
                  </span>
                )}
                <span className="text-xs text-amber-950 font-extrabold bg-amber-400 border border-amber-500 px-3 py-1 rounded-full shrink-0 shadow-xs">
                  {selectedImages.length} صور مختارة
                </span>
              </div>
            </div>

            {/* SECTION 1: Video Tour Upload & Camera Only (No Links) */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <span>فيديو جولة المعاينة التفقدية للعقار</span>
                      <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">رفع أو تصوير مباشر</span>
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      رفع ملف فيديو من جهازك أو تصوير فيديو مباشر بالكاميرا
                    </p>
                  </div>
                </div>

                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl('');
                      onShowToast('تم حذف الفيديو المرفق', 'info');
                    }}
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف الفيديو</span>
                  </button>
                )}
              </div>

              {/* Upload file or record video from device */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isProcessingVideo}
                  onClick={() => videoFileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 group"
                >
                  <Film className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>رفع ملف فيديو من الجهاز</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessingVideo}
                  onClick={() => videoCameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 group"
                >
                  <Video className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>تصوير فيديو بالكاميرا</span>
                </button>
              </div>

              {/* Video Processing Spinner */}
              {isProcessingVideo && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-300 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>جاري معالجة ورفع ملف الفيديو للعقار...</span>
                </div>
              )}

              {/* Live Video Player Preview Box */}
              {videoUrl && (
                <div className="p-3 bg-black/60 rounded-xl border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-400">
                        معاينة الفيديو المرفوع للعقار:
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      جاهز للعرض في جولة المعاينة
                    </span>
                  </div>

                  <div className="relative aspect-video max-h-56 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800 shadow-inner">
                    <video
                      src={formatVideoDetails(videoUrl).embedUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Photos Album Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>ألبوم صور العقار والمعاينة</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    يمكنك رفع عدة صور بجودة عالية، وتحديد صورة الغلاف الرئيسية
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessingImages}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>رفع صور متعددة</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingImages}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-600" />
                    <span>تصوير بالكاميرا</span>
                  </button>
                </div>
              </div>

              {/* Image processing loader */}
              {isProcessingImages && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-900 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>جاري معالجة وضغط الصور لتسريع التصفح في المنصة...</span>
                </div>
              )}

              {/* Selected Photos Gallery with Cover Selector & Delete */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>معاينة الصور المختارة (الصورة الأولى بإطار ذهبي هي الغلاف الرئيسي):</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {selectedImages.map((imgUrl, idx) => {
                    const isCover = idx === 0;
                    return (
                      <div
                        key={idx}
                        className={`group relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border-2 transition shadow-xs ${
                          isCover ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`عقار ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Cover Badge or Make Cover Button */}
                        {isCover ? (
                          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                            <Star className="w-3 h-3 fill-slate-950" />
                            <span>الغلاف الرئيسي</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(idx)}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shadow"
                            title="تعيين كغلاف رئيسي"
                          >
                            <Star className="w-2.5 h-2.5" />
                            <span>تعيين غلاف</span>
                          </button>
                        )}

                        {/* Image sequence badge */}
                        <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                          #{idx + 1}
                        </span>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1.5 left-1.5 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow transition opacity-80 group-hover:opacity-100"
                          title="حذف هذه الصورة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>



              {/* Sample Catalog Toggle */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSampleGallery(!showSampleGallery)}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition"
                >
                  <span>اختر صور إضافية من مكتبة سكن بلس الجاهزة</span>
                  {showSampleGallery ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showSampleGallery && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 animate-in fade-in duration-150">
                    {SAMPLE_IMAGES.map((sample, idx) => {
                      const isSelected = selectedImages.includes(sample.url);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleSampleImage(sample.url)}
                          className={`relative rounded-xl overflow-hidden aspect-video cursor-pointer border-2 transition ${
                            isSelected ? 'border-amber-500 shadow-md ring-2 ring-amber-400/50' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={sample.url} alt={sample.label} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded truncate text-center">
                            {sample.label}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 font-black py-3 rounded-2xl text-sm shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                canPublishDirectly
                  ? 'bg-blue-950 hover:bg-blue-900 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'جاري المعالجة...'
                  : canPublishDirectly
                  ? 'نشر العقار فوراً في سكن بلس'
                  : 'إرسال العقار للمالك للموافقة على النشر'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
