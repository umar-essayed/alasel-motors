import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const R2_CONFIG = {
  bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'el-wikalla',
  endpoint: import.meta.env.VITE_R2_ENDPOINT || 'https://07079473a194adefc9183b88f04405f4.r2.cloudflarestorage.com',
  accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '0f305d2af000bc2ae48148de3a2c2df2',
  secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '17d41d88f27578fbf078bd1936a6ff059bacdf37fb834316a7c0e9eb7b3aa1cf',
  region: import.meta.env.VITE_R2_REGION || 'auto',
};

const s3Client = new S3Client({
  region: R2_CONFIG.region,
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

export async function uploadImageToR2(
  file: File | Blob,
  key: string,
  contentType: string = 'image/webp'
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3Client.send(command);
  return `${R2_CONFIG.endpoint}/${R2_CONFIG.bucketName}/${key}`;
}

export async function listR2Images(): Promise<{ key: string; lastModified?: Date; size?: number }[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      MaxKeys: 100,
    });
    const res = await s3Client.send(command);
    return (res.Contents || []).map((item) => ({
      key: item.Key || '',
      lastModified: item.LastModified,
      size: item.Size,
    }));
  } catch (err) {
    console.error('Failed to list R2 images:', err);
    return [];
  }
}
