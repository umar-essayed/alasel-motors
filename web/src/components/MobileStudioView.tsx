import React, { useState } from 'react';
import { ClearanceDoc, Engine } from '../types';
import { Search, Image, ExternalLink, ShieldCheck, ZoomIn, Eye, RotateCw } from 'lucide-react';
import { R2_CONFIG } from '../services/r2Service';

interface MobileStudioViewProps {
  clearanceDocs: ClearanceDoc[];
  engines: Engine[];
  isLoading: boolean;
}

export const MobileStudioView: React.FC<MobileStudioViewProps> = ({
  clearanceDocs,
  engines,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const filteredDocs = clearanceDocs.filter((doc) => {
    return (
      doc.customsDocNumber.toLowerCase().includes(search.toLowerCase()) ||
      doc.category.toLowerCase().includes(search.toLowerCase()) ||
      doc.country.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-3 pb-24 text-xs">
      {/* Search Header */}
      <div className="sticky top-14 z-20 bg-black/95 backdrop-blur-md pt-1 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الإفراج الجمركي، الفئة..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* R2 Cloud Storage Info */}
      <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-amber-500" />
          <div>
            <span className="font-bold text-zinc-200 block text-xs">مستودع الوثائق السحابي</span>
            <span className="text-[10px] text-zinc-500">Cloudflare R2 • {R2_CONFIG.bucketName}</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
          متصل
        </span>
      </div>

      {/* Docs Gallery Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredDocs.length === 0 ? (
          <div className="col-span-2 bg-zinc-950 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 text-xs">
            {isLoading ? 'جارٍ فحص وثائق الإفراجات من السحابة...' : 'لا توجد مستندات إفراج جمركي مسجلة'}
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const imgSrc = doc.r2Url || doc.imageData;
            return (
              <div
                key={doc.id}
                onClick={() => imgSrc && setActivePhoto(imgSrc)}
                className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden flex flex-col cursor-pointer active:scale-98 transition-transform"
              >
                <div className="h-32 bg-black flex items-center justify-center overflow-hidden relative">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={doc.customsDocNumber}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-zinc-600 flex flex-col items-center gap-1">
                      <Image className="w-6 h-6" />
                      <span className="text-[9px]">بدون صورة</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-amber-400">
                    {doc.engineIds?.length || 0} مكنة
                  </span>
                </div>

                <div className="p-2.5 space-y-1">
                  <span className="font-mono font-bold text-[11px] text-zinc-100 block truncate">
                    #{doc.customsDocNumber}
                  </span>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{doc.country}</span>
                    <span className="font-mono">{doc.importDate}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fullscreen Photo Viewer */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white">
            <span className="font-bold text-xs">معاينة مستند الإفراج الجمركي</span>
            <button
              onClick={() => setActivePhoto(null)}
              className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
            <img
              src={activePhoto}
              alt="وثيقة"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          </div>

          <div className="flex gap-2">
            <a
              href={activePhoto}
              target="_blank"
              rel="noreferrer"
              className="flex-1 bg-amber-500 text-black font-bold py-2.5 rounded-xl text-center text-xs flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              فتح الصورة بالحجم الكامل
            </a>
            <button
              onClick={() => setActivePhoto(null)}
              className="flex-1 bg-zinc-900 text-white font-bold py-2.5 rounded-xl text-center text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
