import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../db';
import { DocumentImage } from '../types';

export const R2_CONFIG = {
  bucketName: 'el-wikalla',
  endpoint: 'https://07079473a194adefc9183b88f04405f4.r2.cloudflarestorage.com',
  accessKeyId: '0f305d2af000bc2ae48148de3a2c2df2',
  secretAccessKey: '17d41d88f27578fbf078bd1936a6ff059bacdf37fb834316a7c0e9eb7b3aa1cf',
  region: 'auto',
};

// S3 Client configured for Cloudflare R2
const s3Client = new S3Client({
  region: R2_CONFIG.region,
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

export interface CompressResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Compresses an image file/blob to WebP (or JPEG fallback)
 * Keeps text & customs stamps super crisp while shrinking size to 100-250KB.
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل تحميل الصورة للمعالجة'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('تعذر إنشاء سياق رسم الصورة Canvas'));
        }

        // Crisp rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP with high quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('فشل ضغط الصورة'));
            }
            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve({
              blob,
              dataUrl,
              width,
              height,
              sizeBytes: blob.size,
            });
          },
          'image/webp',
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates an intelligent Cloudflare R2 file name:
 * Formatted with: Business Name + Engine Number + Category + Date Timestamp + Random Hex
 * Example: "el-wikalla-ENG_2TR184920-clearance_stamp-20261007_220612-4a9f.webp"
 */
export function generateSmartImageName(
  engineNumber: string,
  category: string,
  extension = 'webp'
): string {
  const cleanEng = (engineNumber || 'UNKNOWN')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_-]/g, '_');

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const salt = Math.random().toString(16).substring(2, 6);
  return `el-wikalla-${cleanEng}-${category}-${dateStr}-${salt}.${extension}`;
}

/**
 * Uploads a binary blob directly to Cloudflare R2
 */
export async function uploadBlobToR2(
  blob: Blob,
  key: string,
  contentType = 'image/webp'
): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: uint8Array,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return public endpoint path
  return `${R2_CONFIG.endpoint}/${R2_CONFIG.bucketName}/${key}`;
}

/**
 * Saves document image locally in IndexedDB (0ms instant display)
 * and attempts immediate upload if online, or queues for background sync if offline.
 */
export async function saveDocumentImage(params: {
  file: File | Blob;
  engineNumber: string;
  engineTitle?: string;
  title: string;
  category: 'clearance_stamp' | 'clearance_full' | 'engine_photo' | 'invoice_doc' | 'other';
}): Promise<DocumentImage> {
  const now = new Date().toISOString();
  const id = `doc-img-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

  // 1. Smart compression
  const compressed = await compressImage(params.file);

  // 2. Smart R2 file name tied to engine number and category
  const fileName = generateSmartImageName(params.engineNumber, params.category, 'webp');
  const r2Key = `engines/${params.engineNumber.toUpperCase().trim()}/${fileName}`;

  const docRecord: DocumentImage = {
    id,
    engineNumber: params.engineNumber.trim().toUpperCase(),
    engineTitle: params.engineTitle,
    title: params.title.trim(),
    category: params.category,
    fileName,
    mimeType: 'image/webp',
    fileSize: compressed.sizeBytes,
    localDataUrl: compressed.dataUrl, // Instant offline display
    r2Key,
    syncStatus: 'pending',
    capturedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // 3. Save locally in IndexedDB first
  await db.documentImages.add(docRecord);

  // Also log in sync audit
  await db.syncAuditLogs.add({
    id: `audit-${Date.now()}`,
    type: 'image_upload',
    status: 'success',
    message: `حفظ مستند محلياً للمحرك (${params.engineNumber}): ${params.title}`,
    itemCount: 1,
    timestamp: now,
  });

  // 4. Try instant upload if online
  if (navigator.onLine) {
    uploadSingleDocumentImage(docRecord, compressed.blob).catch((err) => {
      console.warn('[R2 Upload] Offline or delayed, queued in outbox:', err);
    });
  }

  return docRecord;
}

/**
 * Helper to upload a single document image record to R2
 */
export async function uploadSingleDocumentImage(
  docRecord: DocumentImage,
  blobFallback?: Blob
): Promise<boolean> {
  try {
    let blob = blobFallback;
    if (!blob && docRecord.localDataUrl) {
      const res = await fetch(docRecord.localDataUrl);
      blob = await res.blob();
    }

    if (!blob || !docRecord.r2Key) {
      throw new Error('لا توجد بيانات للصورة للرفع');
    }

    const r2Url = await uploadBlobToR2(blob, docRecord.r2Key, docRecord.mimeType);

    const now = new Date().toISOString();
    await db.documentImages.update(docRecord.id, {
      r2Url,
      syncStatus: 'synced',
      updatedAt: now,
    });

    await db.syncAuditLogs.add({
      id: `audit-${Date.now()}`,
      type: 'image_upload',
      status: 'success',
      message: `تم رفع صورة المستند إلى Cloudflare R2 بنجاح: ${docRecord.fileName}`,
      itemCount: 1,
      details: r2Url,
      timestamp: now,
    });

    return true;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[R2 Upload Error]', errorMsg);
    await db.documentImages.update(docRecord.id, {
      syncStatus: 'failed',
      errorMessage: errorMsg,
      updatedAt: new Date().toISOString(),
    });
    return false;
  }
}

/**
 * Background Queue Processor: Uploads all pending images to R2
 */
export async function processPendingImagesQueue(): Promise<{
  total: number;
  uploaded: number;
}> {
  if (!navigator.onLine) {
    return { total: 0, uploaded: 0 };
  }

  const pending = await db.documentImages
    .where('syncStatus')
    .equals('pending')
    .toArray();

  let uploaded = 0;
  for (const doc of pending) {
    const ok = await uploadSingleDocumentImage(doc);
    if (ok) uploaded++;
  }

  return { total: pending.length, uploaded };
}

// Auto-trigger queue when internet connection is detected
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 [Network] Online detected — flushing pending R2 images...');
    processPendingImagesQueue();
  });
}
