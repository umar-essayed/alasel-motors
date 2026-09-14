import React, { useState } from 'react';
import { ClearanceDoc, Engine } from '../../types';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileCheck,
  Building,
  Calendar,
  Hash,
} from 'lucide-react';

interface ClearanceDocModalProps {
  doc: ClearanceDoc | null;
  engine?: Engine | null;
  onClose: () => void;
}

export const ClearanceDocModal: React.FC<ClearanceDocModalProps> = ({
  doc,
  engine,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!doc) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>ورق الإفراج الجمركي - مكنة رقم ${doc.engineNumber}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 10px; }
            .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .meta { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
            img { max-width: 100%; height: auto; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>محل الأصيل لمواتير السيارات</h2>
            <p>صورة طبق الأصل من أوراق الإفراج والتخليص الجمركي المعتمدة</p>
          </div>
          <div class="meta">
            <div>رقم المكنة: ${doc.engineNumber}</div>
            <div>رقم الإفراج الجمركي: ${doc.clearanceNumber || 'غير محدد'}</div>
            <div>تاريخ الإفراج: ${doc.date}</div>
          </div>
          <img src="${doc.imageData}" alt="ورق الإفراج الجمركي" />
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = doc.imageData;
    link.download = doc.fileName || `إفراج_جمركي_مكنة_${doc.engineNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-amber-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white">
                  أوراق الإفراج الجمركي والتخليص
                </h3>
                <span className="bg-amber-400 text-slate-950 font-mono font-bold text-xs px-2 py-0.5 rounded-md">
                  {doc.engineNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {engine ? `${engine.carBrand} - ${engine.carModel} (${engine.modelYear})` : 'مستند مخصص لترخيص المحرك بالمرور'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>طباعة المستند</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
              title="تحميل الصورة"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata info strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-900">الجمرك:</strong>{' '}
              {doc.customsOffice || 'جمرك بورسعيد الاستيرادي'}
            </span>
            <span className="flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-900">رقم الإفراج:</strong>{' '}
              {doc.clearanceNumber || 'مسجل بالنظام'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-900">تاريخ الإفراج:</strong> {doc.date}
            </span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-slate-700">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              title="تدوير"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Image Display Area */}
        <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center min-h-[400px]">
          <div
            className="transition-transform duration-150 origin-center max-w-full flex items-center justify-center"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={doc.imageData}
              alt={`إفراج جمركي مكنة ${doc.engineNumber}`}
              className="max-h-[650px] w-auto rounded-lg shadow-md border border-slate-300 bg-white object-contain"
            />
          </div>
        </div>

        {/* Footer */}
        {doc.notes && (
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 text-xs text-slate-600">
            <strong className="text-slate-800">ملاحظات:</strong> {doc.notes}
          </div>
        )}
      </div>
    </div>
  );
};
