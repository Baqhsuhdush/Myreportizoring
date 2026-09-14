const KEY_PREFIX = "conspects";

export function buildConspectImageKey(
  lessonId: string,
  studentId: string,
  fileName: string
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-100);
  return `${KEY_PREFIX}/${lessonId}/${studentId}/${crypto.randomUUID()}-${safeName}`;
}

export async function uploadConspectImage(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType: string
): Promise<void> {
  await bucket.put(key, data, { httpMetadata: { contentType } });
}

export async function getConspectImage(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return bucket.get(key);
}

export async function deleteConspectImage(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

export async function deleteConspectImages(
  bucket: R2Bucket,
  keys: string[]
): Promise<void> {
  await Promise.all(keys.map((key) => bucket.delete(key)));
}
