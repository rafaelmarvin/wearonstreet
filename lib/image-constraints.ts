// Image rules shared by the admin upload form (client) and the uploader (server).
// Keep these in step with the bucket limits in migration 0006_product_images.sql.

export const MAX_IMAGE_MB = 5;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
