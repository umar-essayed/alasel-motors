import React, { useState } from 'react';
import { ClearanceDoc, Engine } from '../../types';
import {
  X,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileCheck2,
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
          <title>ورق الإفراج الجمركي - محرك ${doc.engineNumber}</title>
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
            <h2>الأصيل موتورز</h2>
            <p>صورة أوراق الإفراج والتخليص الجمركي المعتمدة</p>
          </div>
          <div class="meta">
            <div>رقم المحرك: ${doc.engineNumber}</div>
            <div>رقم الإفراج: ${doc.clearanceNumber || '—'}</div>
            <div>تاريخ الإفراج: ${doc.date || '—'}</div>
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
    link.download = doc.fileName || `إفراج_محرك_${doc.engineNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-zinc-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">ورقة الإفراج الجمركي</h3>
                <span className="font-mono font-bold text-xs bg-zinc-800 text-zinc-200 px-2 py-0.5 rounded">
                  {doc.engineNumber}
                </span>
              </div>
              {engine && (
                <span className="text-[11px] text-zinc-400 block">
                  {engine.carBrand} {engine.carModel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg cursor-pointer"
              title="تحميل"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata info strip */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-2 flex flex-wrap items-center justify-between text-xs text-zinc-600 font-mono">
          <div className="flex items-center gap-4">
            {doc.customsOffice && <span>الجمرك: <strong className="text-zinc-900">{doc.customsOffice}</strong></span>}
            {doc.clearanceNumber && <span>رقم الإفراج: <strong className="text-zinc-900">{doc.clearanceNumber}</strong></span>}
            {doc.date && <span>التاريخ: {doc.date}</span>}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 font-sans">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
              className="p-1 hover:bg-zinc-200 rounded text-zinc-700 cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
              className="p-1 hover:bg-zinc-200 rounded text-zinc-700 cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 hover:bg-zinc-200 rounded text-zinc-700 cursor-pointer"
              title="تدوير"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Viewer Container */}
        <div className="flex-1 overflow-auto bg-zinc-100 p-4 flex items-center justify-center min-h-[350px]">
          <div
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
            className="max-w-full"
          >
            <img
              src={doc.imageData}
              alt="ورق الإفراج الجمركي"
              className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md border border-zinc-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
