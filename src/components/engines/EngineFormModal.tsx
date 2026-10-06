import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Engine, Supplier } from '../../types';
import {
  X,
  Upload,
  AlertCircle,
  FileCheck2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EngineFormModalProps {
  engine?: Engine | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const COMMON_BRANDS = [
  'هيونداي',
  'كيا',
  'تويوتا',
  'نيسان',
  'ميتسوبيشي',
  'شيفروليه',
  'دايو',
  'رينو',
  'بيجو',
  'أوبل',
  'سكودا',
  'فولكس فاجن',
  'أخرى',
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
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');

  // Optional / Collapsible details
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [additionalCost, setAdditionalCost] = useState<number | ''>('');
  const [supplierId, setSupplierId] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [engineCapacity, setEngineCapacity] = useState('');
  const [transmissionType, setTransmissionType] = useState('');
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');

  // Clearance doc fields (100% strictly local)
  const [clearanceImage, setClearanceImage] = useState<string | null>(null);
  const [clearanceFileName, setClearanceFileName] = useState('');
  const [customsOffice, setCustomsOffice] = useState('');
  const [clearanceNumber, setClearanceNumber] = useState('');
  const [clearanceDate, setClearanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.suppliers.toArray().then((sups) => setSuppliers(sups));
    }
  }, [isOpen]);

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
      setCostPrice(engine.costPrice || '');
      setSellingPrice(engine.sellingPrice || '');
      setAdditionalCost(engine.additionalCost || '');
      setSupplierId(engine.supplierId || '');
      setModelYear(engine.modelYear || '');
      setEngineCapacity(engine.engineCapacity || '');
      setTransmissionType(engine.transmissionType || '');
      setCondition(engine.condition || '');
      setNotes(engine.notes || '');

      if (engine.hasClearanceDoc) {
        db.clearanceDocs.where('engineNumber').equals(engine.engineNumber).first().then((doc) => {
          if (doc) {
            setClearanceImage(doc.imageData);
            setClearanceFileName(doc.fileName);
            setCustomsOffice(doc.customsOffice || '');
            setClearanceNumber(doc.clearanceNumber || '');
            setClearanceDate(doc.date || '');
          }
        });
      }
      setShowAdvanced(Boolean(engine.hasClearanceDoc || engine.supplierId || engine.additionalCost));
    } else {
      // Clear form
      setEngineNumber('');
      setCarBrand(COMMON_BRANDS[0]);
      setCustomBrand('');
      setCarModel('');
      setCostPrice('');
      setSellingPrice('');
      setAdditionalCost('');
      setSupplierId('');
      setModelYear('');
      setEngineCapacity('');
      setTransmissionType('');
      setCondition('');
      setNotes('');
      setClearanceImage(null);
      setClearanceFileName('');
      setClearanceNumber('');
      setCustomsOffice('');
      setClearanceDate(new Date().toISOString().split('T')[0]);
      setError('');
      setShowAdvanced(false);
    }
  }, [engine, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('يرجى اختيار ملف صورة صالح');
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
      setError('رقم المحرك مطلوب');
      return;
    }

    if (!carModel.trim()) {
      setError('موديل السيارة مطلوب');
      return;
    }

    if (!costPrice || Number(costPrice) <= 0) {
      setError('سعر الشراء مطلوب');
      return;
    }

    if (!sellingPrice || Number(sellingPrice) <= 0) {
      setError('سعر البيع مطلوب');
      return;
    }

    setIsSaving(true);

    try {
      if (!engine) {
        const existing = await db.engines.where('engineNumber').equals(cleanEngineNum).first();
        if (existing) {
          setError(`رقم المحرك "${cleanEngineNum}" مسجل مسبقاً بالمخزن`);
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

      // Save clearance doc locally
      if (clearanceImage) {
        hasDoc = true;
        clearanceDocId = `doc-${cleanEngineNum}-${Date.now()}`;
        const existingDoc = await db.clearanceDocs.where('engineNumber').equals(cleanEngineNum).first();
        if (existingDoc) {
          await db.clearanceDocs.update(existingDoc.id, {
            imageData: clearanceImage,
            fileName: clearanceFileName || `إفراج_${cleanEngineNum}.png`,
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
            fileName: clearanceFileName || `إفراج_${cleanEngineNum}.png`,
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
        transmissionType: transmissionType.trim(),
        condition: condition.trim(),
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

        // Update supplier balance if selected for a new engine purchase
        if (selectedSupplier && Number(costPrice) > 0) {
          await db.suppliers.update(selectedSupplier.id, {
            totalPurchases: selectedSupplier.totalPurchases + Number(costPrice),
            balance: selectedSupplier.balance + Number(costPrice),
            updatedAt: now,
          });
        }
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-zinc-900 text-white px-5 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            {engine ? 'تعديل بيانات المحرك' : 'إضافة محرك جديد'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                رقم المحرك (كود البلوك المدموغ) *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="G4FC-123456"
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  الماركة *
                </label>
                <select
                  value={carBrand}
                  onChange={(e) => setCarBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
                >
                  {COMMON_BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {carBrand === 'أخرى' && (
                  <input
                    type="text"
                    placeholder="اسم الماركة..."
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    className="mt-1.5 w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  الموديل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="إلنترا، سيراتو..."
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  سعر الشراء (التكلفة) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  سعر البيع المطلوب *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-sm font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:border-zinc-800"
                />
              </div>
            </div>

            {Number(costPrice) > 0 && Number(sellingPrice) > 0 && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-zinc-600">التكلفة: <strong>{totalCost.toLocaleString('en-US')} ج.م</strong></span>
                <span className={expectedProfit >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                  الربح المتوقع: {expectedProfit.toLocaleString('en-US')} ج.م
                </span>
              </div>
            )}
          </div>

          {/* Toggle Advanced / Clearance Details */}
          <div className="pt-2 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-semibold text-zinc-700 hover:text-zinc-900 py-1.5 cursor-pointer"
            >
              <span>تفاصيل إضافية وأوراق التخليص الجمركي</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      المورد
                    </label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none"
                    >
                      <option value="">بدون مورد</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      مصاريف شحن وفحص
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={additionalCost}
                      onChange={(e) => setAdditionalCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                      الفتيس
                    </label>
                    <input
                      type="text"
                      placeholder="أوتوماتيك / عادي"
                      value={transmissionType}
                      onChange={(e) => setTransmissionType(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                      سنة الصنع
                    </label>
                    <input
                      type="text"
                      placeholder="2015"
                      value={modelYear}
                      onChange={(e) => setModelYear(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                      السعة
                    </label>
                    <input
                      type="text"
                      placeholder="1600cc"
                      value={engineCapacity}
                      onChange={(e) => setEngineCapacity(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Customs Clearance Upload */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2.5">
                  <span className="text-xs font-semibold text-zinc-800 block">
                    ورقة الإفراج الجمركي (حفظ محلي فقط)
                  </span>

                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{clearanceImage ? 'تغيير الصورة' : 'اختيار صورة الورقة'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>

                    {clearanceImage && (
                      <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>تم إرفاق الصورة</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <input
                        type="text"
                        placeholder="رقم الإفراج الجمركي"
                        value={clearanceNumber}
                        onChange={(e) => setClearanceNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="مكتب الجمرك (بورسعيد، السويس...)"
                        value={customsOffice}
                        onChange={(e) => setCustomsOffice(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="ملاحظات المحرك..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'جارٍ الحفظ...' : engine ? 'حفظ التعديلات' : 'إضافة المحرك'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
