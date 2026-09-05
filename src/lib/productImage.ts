import defaultImage from "@/assets/defaults/default-image.jpg";

export const DEFAULT_IMAGES = { daster: defaultImage, pajamas: defaultImage };

export function resolveProductImage(
  url: string | null | undefined,
  fallback: "daster" | "pajamas" = "daster",
): string {
  if (url && url.trim().length > 0) return url;
  return DEFAULT_IMAGES[fallback];
}
