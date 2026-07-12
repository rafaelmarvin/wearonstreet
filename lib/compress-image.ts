// Browser-side image compression, run before the file is uploaded.
//
// Admins upload straight from a phone or camera, where a single photo is easily
// 2-5 MB. Serving those untouched would burn through Supabase's free-tier egress
// (5 GB/month) in a few hundred visits. Downscaling to a sane edge length and
// re-encoding as WebP typically cuts a photo ~10x with no visible difference at
// the sizes the store actually renders (~700px on the product page).

import { MAX_IMAGE_BYTES } from "./image-constraints";

/** Longest edge we keep. The product page renders ~700px wide, so this still
 *  leaves headroom for 2x retina displays. */
const MAX_EDGE = 1600;

/** WebP quality. 0.9 is visually lossless for photos; below ~0.8 artifacts start
 *  showing on flat colours and the character artwork. */
const QUALITY = 0.9;

export interface CompressionResult {
  file: File;
  originalBytes: number;
  compressed: boolean;
}

/** Returns a smaller WebP version of `file`, or the original when it can't be
 *  improved (or the browser can't decode it — never block the upload on this). */
export async function compressImage(file: File): Promise<CompressionResult> {
  const unchanged: CompressionResult = {
    file,
    originalBytes: file.size,
    compressed: false,
  };

  if (!file.type.startsWith("image/")) return unchanged;

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, so phone photos don't come out sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return unchanged;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return unchanged;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );

    // WebP keeps the alpha channel, so transparent character artwork survives.
    if (!blob || blob.size >= file.size) return unchanged;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return {
      file: new File([blob], name, { type: "image/webp" }),
      originalBytes: file.size,
      compressed: true,
    };
  } finally {
    bitmap.close();
  }
}

export function isTooBig(file: File): boolean {
  return file.size > MAX_IMAGE_BYTES;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
