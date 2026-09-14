import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Engine, Supplier } from '../../types';
import {
  X,
  Upload,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Car,
  DollarSign,
  FileText,
  Trash2,
} from 'lucide-react';

interface EngineFormModalProps {
  engine?: Engine | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_BRANDS = [
  'هيونداي (Hyundai)',
  'كيا (Kia)',
  'تويوتا (Toyota)',
  'نيسان (Nissan)',
  'ميتسوبيشي (Mitsubishi)',
  'شيفروليه (Chevrolet)',
  'دايو (Daewoo)',
  'رينو (Renault)',
  'بيجو (Peugeot)',
  'أوبل (Opel)',
  'سكودا (Skoda)',
  'فولكس فاجن (Volkswagen)',
  'هوندا (Honda)',
  'مازدا (Mazda)',
];

export const EngineFormModal: React.FC<EngineFormModalProps> = ({
  engine,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [engineNumber, setEngineNumber] = useState('');
  const [carBrand, setCarBrand] = useState(COMMON_BRANDS[0]);
  const [customBrand, setCustomBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [engineCapacity, setEngineCapacity] = useState('');
  const [transmissionType, setTransmissionType] = useState('يعمل أوتوماتيك وعادي');
  const [condition, setCondition] = useState('استيراد كوريا خلع كامل بحالة الزيرو');
  const [costPrice, setCostPrice] = useState<number | ''>(35000);
  const [additionalCost, setAdditionalCost] = useState<number | ''>(1000);
  const [sellingPrice, setSellingPrice] = useState<number | ''>(45000);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');

  // Clearance doc fields
  const [clearanceImage, setClearanceImage] = useState<string | null>(null);
  const [clearanceFileName, setClearanceFileName] = useState('');
  const [customsOffice, setCustomsOffice] = useState('جمرك بورسعيد الاستيرادي');
  const [clearanceNumber, setClearanceNumber] = useState('');
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    db.suppliers.toArray().then((sups) => setSuppliers(sups));
  }, []);

  useEffect(() => {
    if (engine) {
      setEngineNumber(engine.engineNumber);
      if (COMMON_BRANDS.includes(engine.carBrand)) {
        setCarBrand(engine.carBrand);
        setCustomBrand('');
      } else {
        setCarBrand('أخرى');
        setCustomBrand(engine.carBrand);
      }
      setCarModel(engine.carModel);
      setModelYear(engine.modelYear);
      setEngineCapacity(engine.engineCapacity);
      setTransmissionType(engine.transmissionType);
      setCondition(engine.condition);
      setCostPrice(engine.costPrice);
      setAdditionalCost(engine.additionalCost);
      setSellingPrice(engine.sellingPrice);
      setSupplierId(engine.supplierId || '');
      setNotes(engine.notes || '');

      // Load existing clearance doc if any
      if (engine.hasClearanceDoc) {
        db.clearanceDocs.where('engineNumber').equals(engine.engineNumber).first().then((doc) => {
          if (doc) {
            setClearanceImage(doc.imageData);
            setClearanceFileName(doc.fileName);
            setCustomsOffice(doc.customsOffice || 'جمرك بورسعيد الاستيرادي');
            setClearanceNumber(doc.clearanceNumber || '');
            setClearanceDate(doc.date);
          }
        });
      }
    } else {
      // Reset form
      setEngineNumber('');
      setCarBrand(COMMON_BRANDS[0]);
      setCustomBrand('');
      setCarModel('');
      setModelYear('');
      setEngineCapacity('');
      setTransmissionType('يعمل أوتوماتيك وعادي');
      setCondition('استيراد خلع كامل بحالة الزيرو');
      setCostPrice(35000);
      setAdditionalCost(1000);
      setSellingPrice(45000);
      setSupplierId(suppliers[0]?.id || '');
      setNotes('');
      setClearanceImage(null);
      setClearanceFileName('');
      setClearanceNumber('');
      setClearanceDate(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [engine, isOpen, suppliers]);

  if (!isOpen) return null;

  // Handle image file selection
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    setClearanceFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setClearanceImage(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const totalCost = (Number(costPrice) || 0) + (Number(additionalCost) || 0);
  const expectedProfit = (Number(sellingPrice) || 0) - totalCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEngineNum = engineNumber.trim().toUpperCase();
    if (!cleanEngineNum) {
      setError('رقم المكنة / المحرك مطلوب');
      return;
    }

    if (!carModel.trim()) {
      setError('موديل وفئة السيارة مطلوب (مثال: إلنترا HD، سيراتو)');
      return;
    }

    if (!costPrice || Number(costPrice) <= 0) {
      setError('سعر الجملة مطلوب ويجب أن يكون أكبر من صفر');
      return;
    }

    if (!sellingPrice || Number(sellingPrice) <= 0) {
      setError('سعر البيع المقترح مطلوب ويجب أن يكون أكبر من صفر');
      return;
    }

    setIsSaving(true);

    try {
      // Check duplicate engine number if creating new
      if (!engine) {
        const existing = await db.engines.where('engineNumber').equals(cleanEngineNum).first();
        if (existing) {
          setError(`رقم المكنة "${cleanEngineNum}" مسجل بالفعل في المخزن مسبقاً!`);
          setIsSaving(false);
          return;
        }
      }

      const selectedSupplier = suppliers.find((s) => s.id === supplierId);
      const brandToSave = carBrand === 'أخرى' ? customBrand.trim() || 'أخرى' : carBrand;
      const engineId = engine ? engine.id : `eng-${Date.now()}`;
      const now = new Date().toISOString();

      let hasDoc = false;
      let clearanceDocId: string | undefined = undefined;

      // Save clearance doc if uploaded
      if (clearanceImage) {
        hasDoc = true;
        clearanceDocId = `doc-${cleanEngineNum}-${Date.now()}`;
        const existingDoc = await db.clearanceDocs.where('engineNumber').equals(cleanEngineNum).first();
        if (existingDoc) {
          await db.clearanceDocs.update(existingDoc.id, {
            imageData: clearanceImage,
            fileName: clearanceFileName || `إفراج_مكنة_${cleanEngineNum}.png`,
            customsOffice,
            clearanceNumber,
            date: clearanceDate,
            updatedAt: now,
          });
          clearanceDocId = existingDoc.id;
        } else {
          await db.clearanceDocs.add({
            id: clearanceDocId,
            engineNumber: cleanEngineNum,
            imageData: clearanceImage,
            fileName: clearanceFileName || `إفراج_مكنة_${cleanEngineNum}.png`,
            mimeType: 'image/jpeg',
            customsOffice,
            clearanceNumber,
            date: clearanceDate,
            createdAt: now,
            updatedAt: now,
            synced: false,
          });
        }
      }

      const engineData: Engine = {
        id: engineId,
        engineNumber: cleanEngineNum,
        carBrand: brandToSave,
        carModel: carModel.trim(),
        modelYear: modelYear.trim(),
        engineCapacity: engineCapacity.trim(),
        transmissionType,
        condition,
        costPrice: Number(costPrice) || 0,
        additionalCost: Number(additionalCost) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        status: engine ? engine.status : 'available',
        supplierId: selectedSupplier?.id,
        supplierName: selectedSupplier?.name,
        notes: notes.trim(),
        hasClearanceDoc: hasDoc || (engine?.hasClearanceDoc ?? false),
        clearanceDocId: clearanceDocId || engine?.clearanceDocId,
        createdAt: engine ? engine.createdAt : now,
        updatedAt: now,
        synced: false,
      };

      if (engine) {
        await db.engines.put(engineData);
      } else {
        await db.engines.add(engineData);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ بيانات المكنة';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                {engine ? 'تعديل بيانات المكنة' : 'إضافة مكنة / موتور جديد للمخزن'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سجل رقم المكنة، الموديل، الأسعار، وأوراق الإفراج الجمركي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Engine Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              بيانات وهوية المحرك
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Engine Number (Core ID) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم المكنة / المحرك (كود البلوك المدموغ) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: G4FC-7489211 أو 1ZR-5421098"
                  value={engineNumber}
                  onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  رقم المكنة فريد ولا يتكرر وهو المعتمد في المرور وأوراق التخليص.
                </span>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ماركة السيارة *
                </label>
                <select
                  value={carBrand}
                  onChange={(e) => setCarBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                >
                  {COMMON_BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value="أخرى">أخرى (كتابة يدوي)</option>
                </select>
                {carBrand === 'أخرى' && (
                  <input
                    type="text"
                    placeholder="اكتب اسم الماركة..."
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className="mt-2 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                )}
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموديل والفئة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إلنترا HD / MD أو سيراتو أو كورولا"
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Model Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سنة الصنع / الموديلات المتوافقة
                </label>
                <input
                  type="text"
                  placeholder="مثال: 2012 - 2016"
                  value={modelYear}
                  onChange={(e) => setModelYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Engine Capacity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السعة والكود (cc)
                </label>
                <input
                  type="text"
                  placeholder="مثال: 1600cc - G4FC"
                  value={engineCapacity}
                  onChange={(e) => setEngineCapacity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Transmission Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الفتيس المتوافق
                </label>
                <select
                  value={transmissionType}
                  onChange={(e) => setTransmissionType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                >
                  <option value="يعمل أوتوماتيك وعادي">يعمل أوتوماتيك وعادي</option>
                  <option value="أوتوماتيك فقط">أوتوماتيك فقط</option>
                  <option value="عادي / مانيوال فقط">عادي / مانيوال فقط</option>
                  <option value="شامل الفتيس الأوتوماتيك راكب">شامل الفتيس الأوتوماتيك راكب</option>
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حالة المكنة
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                >
                  <option value="استيراد كوريا خلع كامل بحالة الزيرو">
                    استيراد كوريا خلع كامل بحالة الزيرو
                  </option>
                  <option value="استيراد يابان بحالة المصنع">
                    استيراد يابان بحالة المصنع
                  </option>
                  <option value="استيراد دبي بالفتيس والكمبيوتر">
                    استيراد دبي بالفتيس والكمبيوتر
                  </option>
                  <option value="خلع محلي مجرب على البنك">
                    خلع محلي مجرب على البنك
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Supplier */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              الحسابات والأسعار والمورد
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Cost Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سعر الجملة (الشراء من المورد) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ج.م</span>
                </div>
              </div>

              {/* Additional Cost */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مصاريف إضافية (شحن / فحص)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={additionalCost}
                    onChange={(e) => setAdditionalCost(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ج.م</span>
                </div>
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سعر البيع المطلوب *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-700 focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ج.م</span>
                </div>
              </div>
            </div>

            {/* Profit margin preview strip */}
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                إجمالي التكلفة الفعلية:{' '}
                <strong className="text-slate-900">{totalCost.toLocaleString('ar-EG')} ج.م</strong>
              </span>
              <span className="text-slate-600">
                هامش الربح المتوقع:{' '}
                <strong className={expectedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {expectedProfit.toLocaleString('ar-EG')} ج.م
                </strong>
              </span>
            </div>

            {/* Supplier Selector */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المورد المستورد منه
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
              >
                <option value="">-- اختياري: اختر المورد أو اترك فارغاً --</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Customs Clearance Doc (Requested specifically by user) */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-amber-500" />
              أوراق الإفراج والتخليص الجمركي (تخزين محلي 100%)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الإفراج الجمركي / الشهادة
                </label>
                <input
                  type="text"
                  placeholder="مثال: 98412 / 2024"
                  value={clearanceNumber}
                  onChange={(e) => setClearanceNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ميناء / جمرك الوصول
                </label>
                <input
                  type="text"
                  placeholder="مثال: جمرك بورسعيد / الإسكندرية"
                  value={customsOffice}
                  onChange={(e) => setCustomsOffice(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Image Upload Box */}
            <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center transition-colors bg-slate-50/50">
              {clearanceImage ? (
                <div className="space-y-3">
                  <div className="relative inline-block max-w-xs">
                    <img
                      src={clearanceImage}
                      alt="معاينة الإفراج الجمركي"
                      className="max-h-44 rounded-lg shadow-sm border border-slate-200 object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setClearanceImage(null);
                        setClearanceFileName('');
                      }}
                      className="absolute -top-2 -left-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md cursor-pointer"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم تحديد صورة الإفراج الجمركي: {clearanceFileName}</span>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500 mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    اضغط لرفع صورة ورقة الإفراج الجمركي للمكنة
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    يدعم صور الكاميرا والمستندات (JPG, PNG, WebP) - تحفظ محلياً على جهازك
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Section 4: Notes */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات إضافية عن المكنة
            </label>
            <textarea
              rows={2}
              placeholder="مثال: جاهزة بالمارش والدينامو، ضغط بساتم ممتاز، كبس 95%..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSaving ? 'جارٍ الحفظ...' : engine ? 'حفظ التعديلات' : 'إضافة المكنة للمخزن'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
