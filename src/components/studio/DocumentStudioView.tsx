import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { DocumentImage, ShopSettings } from '../../types';
import { saveDocumentImage, uploadSingleDocumentImage } from '../../services/imageService';
import {
  FileText,
  Search,
  Upload,
  Cloud,
  HardDrive,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Printer,
  Trash2,
  X,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface DocumentStudioViewProps {
  settings?: ShopSettings;
}

export const DocumentStudioView: React.FC<DocumentStudioViewProps> = ({ settings: _settings }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'pending'>('all');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [inspectingImage, setInspectingImage] = useState<DocumentImage | null>(null);

  // Upload form state
  const [engineNumberInput, setEngineNumberInput] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentImage['category']>('clearance_stamp');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Zoom state in inspect modal
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Live queries
  const allImages = useLiveQuery(() => db.documentImages.reverse().sortBy('createdAt')) || [];
  const engines = useLiveQuery(() => db.engines.toArray()) || [];

  const filteredImages = allImages.filter((img) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      img.engineNumber.toLowerCase().includes(q) ||
      img.title.toLowerCase().includes(q) ||
      (img.engineTitle && img.engineTitle.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory;
    const matchesSync = syncFilter === 'all' || img.syncStatus === syncFilter;

    return matchesSearch && matchesCategory && matchesSync;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!docTitle) {
        setDocTitle(
          docCategory === 'clearance_stamp'
            ? 'ختم الإفراج الجمركي'
            : docCategory === 'clearance_full'
            ? 'أوراق الإفراج الجمركي الكاملة'
            : docCategory === 'engine_photo'
            ? 'صورة المحرك'
            : 'مستند المحرك'
        );
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!selectedFile) {
      setUploadError('يرجى اختيار صورة للمستند');
      return;
    }

    if (!engineNumberInput.trim()) {
      setUploadError('يرجى تحديد أو إدخال رقم المكنة المربوط بها المستند');
      return;
    }

    setIsUploading(true);
    try {
      const matchingEng = engines.find(
        (eng) => eng.engineNumber.toUpperCase() === engineNumberInput.trim().toUpperCase()
      );

      await saveDocumentImage({
        file: selectedFile,
        engineNumber: engineNumberInput.trim().toUpperCase(),
        engineTitle: matchingEng ? `${matchingEng.carBrand} ${matchingEng.carModel}` : undefined,
        title: docTitle.trim() || 'مستند إفراج جمركي',
        category: docCategory,
      });

      // Reset
      setIsUploadOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setEngineNumberInput('');
      setDocTitle('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ ورفع المستند';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (img: DocumentImage) => {
    if (window.confirm(`هل أنت متأكد من حذف هذا المستند (${img.title})؟`)) {
      await db.documentImages.delete(img.id);
      if (inspectingImage?.id === img.id) {
        setInspectingImage(null);
      }
    }
  };

  const handleRetryUpload = async (img: DocumentImage) => {
    const ok = await uploadSingleDocumentImage(img);
    if (ok) {
      alert('تم رفع الصورة بنجاح إلى Cloudflare R2!');
    } else {
      alert('تعذر الرفع حالياً، يرجى التحقق من اتصال الإنترنت.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                استوديو الورق والمستندات الجمركية
              </h2>
              <span className="text-[11px] text-zinc-400">
                أرشيف صور الإفراجات والمحركات — تخزين محلي فوري ومزامنة سحابية على Cloudflare R2
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEngineNumberInput('');
              setSelectedFile(null);
              setPreviewUrl(null);
              setDocTitle('');
              setUploadError('');
              setIsUploadOpen(true);
            }}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع مستند / ورق مكنة</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="بحث برقم المكنة، الموديل، أو عنوان المستند..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              selectedCategory === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            الكل ({allImages.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('clearance_stamp')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              selectedCategory === 'clearance_stamp'
                ? 'bg-amber-500 text-black'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            أختام الإفراج
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('clearance_full')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              selectedCategory === 'clearance_full'
                ? 'bg-amber-500 text-black'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            ورق إفراج كامل
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('engine_photo')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              selectedCategory === 'engine_photo'
                ? 'bg-amber-500 text-black'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            صور المواتير
          </button>
        </div>

        {/* Sync Status Filter */}
        <div className="flex items-center gap-1 border-t md:border-t-0 md:border-r border-zinc-200 dark:border-zinc-800 pt-2 md:pt-0 md:pr-3 text-[11px]">
          <button
            type="button"
            onClick={() => setSyncFilter('all')}
            className={`px-2 py-1 rounded cursor-pointer ${
              syncFilter === 'all' ? 'font-bold text-zinc-900 dark:text-white' : 'text-zinc-400'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setSyncFilter('synced')}
            className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer ${
              syncFilter === 'synced' ? 'font-bold text-emerald-500' : 'text-zinc-400'
            }`}
          >
            <Cloud className="w-3 h-3" />
            <span>سحابي R2</span>
          </button>
          <button
            type="button"
            onClick={() => setSyncFilter('pending')}
            className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer ${
              syncFilter === 'pending' ? 'font-bold text-amber-500' : 'text-zinc-400'
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>محلي فقط</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredImages.map((img) => {
          const isR2Synced = img.syncStatus === 'synced' && img.r2Url;
          const displaySrc = img.localDataUrl || img.r2Url || '';

          return (
            <div
              key={img.id}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs hover:border-amber-500/50 transition-all group flex flex-col"
            >
              {/* Image Preview Box */}
              <div
                onClick={() => {
                  setInspectingImage(img);
                  setZoomLevel(1);
                  setRotation(0);
                }}
                className="relative aspect-4/3 bg-zinc-100 dark:bg-zinc-900 cursor-pointer overflow-hidden flex items-center justify-center"
              >
                {displaySrc ? (
                  <img
                    src={displaySrc}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <FileText className="w-8 h-8 text-zinc-400" />
                )}

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  {isR2Synced ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-emerald-400 text-[10px] font-bold">
                      <Cloud className="w-3 h-3" />
                      <span>R2</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-amber-400 text-[10px] font-bold">
                      <HardDrive className="w-3 h-3" />
                      <span>محلي</span>
                    </span>
                  )}
                </div>

                {/* Quick Inspect Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <div className="p-2 rounded-full bg-white/20 text-white backdrop-blur-xs">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {img.engineNumber}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      {Math.round(img.fileSize / 1024)} ك.ب
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                    {img.title}
                  </p>

                  {img.engineTitle && (
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {img.engineTitle}
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {img.createdAt.split('T')[0]}
                  </span>

                  <div className="flex items-center gap-1">
                    {!isR2Synced && (
                      <button
                        type="button"
                        onClick={() => handleRetryUpload(img)}
                        className="p-1 text-amber-500 hover:text-amber-400 rounded cursor-pointer"
                        title="رفع الصورة للسحابة الآن"
                      >
                        <Cloud className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(img)}
                      className="p-1 text-zinc-400 hover:text-rose-600 rounded cursor-pointer"
                      title="حذف المستند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredImages.length === 0 && (
          <div className="col-span-full py-16 text-center text-zinc-400 dark:text-zinc-600 text-xs">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>لا توجد مستندات أو صور مطابقة للبحث</p>
            <p className="text-[11px] text-zinc-500 mt-1">اضغط على «رفع مستند» لإضافة أول ورقة إفراج أو صورة محرك</p>
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  رفع مستند جمركي أو صورة محرك
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              {/* Engine Number Input / Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  رقم المكنة المدموغ (Unique Engine No) *
                </label>
                <input
                  type="text"
                  list="enginesListDatalist"
                  placeholder="مثال: 2TR-184920..."
                  value={engineNumberInput}
                  onChange={(e) => setEngineNumberInput(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
                <datalist id="enginesListDatalist">
                  {engines.map((eng) => (
                    <option key={eng.id} value={eng.engineNumber}>
                      {eng.engineNumber} — {eng.carBrand} {eng.carModel}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  نوع وتصنيف المستند
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentImage['category'])}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="clearance_stamp">ختم الإفراج الجمركي (Clearance Stamp)</option>
                  <option value="clearance_full">أوراق الإفراج الجمركي الكاملة</option>
                  <option value="engine_photo">صورة الموتور الفعلية (Engine Body Photo)</option>
                  <option value="invoice_doc">أوراق فحص وتسليم المرور</option>
                  <option value="other">مستند آخر</option>
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  عنوان المستند / البيان
                </label>
                <input
                  type="text"
                  placeholder="مثال: ختم جمارك الإسكندرية / شهادة المنشأ..."
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  اختيار صورة المستند (يتم ضغطها وتشفيرها آلياً) *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white dark:file:bg-amber-500 dark:file:text-black cursor-pointer"
                />
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded border border-zinc-300 dark:border-zinc-700"
                  />
                  <div className="text-[11px]">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                      معاينة المستند
                    </span>
                    <span className="text-zinc-400 block">
                      سيتم ربطها باسم: el-wikalla-{engineNumberInput || 'ENG'}-...webp
                    </span>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-black transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'جارٍ الضغط والرفع...' : 'حفظ ورفع المستند'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN HIGH-RESOLUTION INSPECT & ZOOM MODAL */}
      {inspectingImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-2 sm:p-4 select-none">
          {/* Top Controls Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-white px-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded bg-amber-500 text-black font-mono font-bold text-xs">
                {inspectingImage.engineNumber}
              </span>
              <div>
                <h3 className="font-bold text-sm">{inspectingImage.title}</h3>
                <span className="text-[11px] text-zinc-400">
                  {inspectingImage.fileName} ({Math.round(inspectingImage.fileSize / 1024)} ك.ب)
                </span>
              </div>
            </div>

            {/* Inspect Tools */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 3))}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                title="تدوير 90 درجة"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                title="طباعة"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setInspectingImage(null)}
                className="p-1.5 bg-zinc-800 hover:bg-rose-700 rounded-lg text-white mr-2"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas Viewing Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div
              id="printable-area"
              className="transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={inspectingImage.localDataUrl || inspectingImage.r2Url}
                alt={inspectingImage.title}
                className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-zinc-800"
              />
            </div>
          </div>

          {/* Footer Info */}
          <div className="no-print pt-2 border-t border-zinc-800 text-zinc-400 text-xs flex justify-between items-center px-2">
            <span>
              الحالة:{' '}
              {inspectingImage.syncStatus === 'synced' ? (
                <strong className="text-emerald-400">مرفوع على Cloudflare R2 (سحابي)</strong>
              ) : (
                <strong className="text-amber-400">محلي (أوفلاين) في انتظار الرفع</strong>
              )}
            </span>
            <span>تاريخ الالتقاط: {inspectingImage.capturedAt.replace('T', ' ').slice(0, 19)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
