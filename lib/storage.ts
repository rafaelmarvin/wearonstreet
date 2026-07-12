import "server-only";

import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/lib/image-constraints";

export const PRODUCT_IMAGE_BUCKET = "product-images";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type UploadResult = {
  url: string | null;
  path: string | null;
  error: string | null;
};

/** Upload an image picked in the admin UI and return its public URL (plus the
 *  storage path, so the caller can roll the upload back if the DB write fails).
 *  An empty file input — the admin left it blank — is not an error.
 *  Uploads use the service role, so bucket RLS is bypassed. */
export async function uploadProductImage(
  file: File | null,
  slug: string,
  kind: "product" | "character",
): Promise<UploadResult> {
  const empty = { url: null, path: null };
  if (!file || file.size === 0) return { ...empty, error: null };

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      ...empty,
      error: `"${file.name}" is not a supported image. Use a JPG, PNG, WEBP or AVIF file.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ...empty,
      error: `"${file.name}" is ${mb} MB. Images must be ${MAX_IMAGE_MB} MB or smaller.`,
    };
  }
  if (!isServiceRoleConfigured()) {
    return {
      ...empty,
      error: "Image uploads need SUPABASE_SERVICE_ROLE_KEY to be set.",
    };
  }

  const supabase = createAdminClient();
  const path = `${slug}/${kind}-${Date.now()}.${EXTENSIONS[file.type]}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    // The most likely cause by far is that migration 0006 hasn't been run.
    return {
      ...empty,
      error: `Could not upload "${file.name}": ${error.message}. Has the product-images bucket been created (migration 0006)?`,
    };
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);

  return { url: data.publicUrl, path, error: null };
}

/** Roll back specific uploads (used when the product row fails to save).
 *  Best effort — an orphaned image is not worth failing the request over. */
export async function removeUploads(paths: (string | null)[]): Promise<void> {
  const real = paths.filter((p): p is string => Boolean(p));
  if (!real.length || !isServiceRoleConfigured()) return;

  await createAdminClient().storage.from(PRODUCT_IMAGE_BUCKET).remove(real);
}

/** Delete every image uploaded for a product. Only ever called after the product
 *  row is gone, so the slug folder cannot belong to anyone else. */
export async function deleteProductImages(slug: string): Promise<void> {
  if (!isServiceRoleConfigured()) return;

  const supabase = createAdminClient();
  const { data: files } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .list(slug);

  if (!files?.length) return;

  await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove(files.map((f) => `${slug}/${f.name}`));
}
