import daster from "@/assets/defaults/daster.jpg";
import pajamas from "@/assets/defaults/pajamas.jpg";

export const DEFAULT_IMAGES = { daster, pajamas };

export function resolveProductImage(url: string | null | undefined, fallback: "daster" | "pajamas" = "daster"): string {
  if (url && url.trim().length > 0) return url;
  return DEFAULT_IMAGES[fallback];
}
