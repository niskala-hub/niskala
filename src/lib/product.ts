export type ProductStatus = "ready" | "coming_soon" | "sold";
export type PriceStatus = "active" | "coming_soon";

export interface ProductStatusInfo {
  status: ProductStatus;
  label: string;
  isSold: boolean;
  isComingSoon: boolean;
  isReady: boolean;
}

export function getProductStatus(product: { status?: string | null; stock: number }): ProductStatus {
  if (product.status === "coming_soon") return "coming_soon";
  if (product.status === "sold" || Number(product.stock) <= 0) return "sold";
  return "ready";
}

export function getProductStatusInfo(product: { status?: string | null; stock: number }): ProductStatusInfo {
  const status = getProductStatus(product);
  return {
    status,
    label: status === "sold" ? "Sold Out" : status === "coming_soon" ? "Coming Soon" : "Ready",
    isSold: status === "sold",
    isComingSoon: status === "coming_soon",
    isReady: status === "ready",
  };
}

export function isProductPriceComingSoon(product: {
  price?: number | null;
  price_status?: string | null;
  status?: string | null;
}): boolean {
  if (product.price_status === "coming_soon") return true;
  if (product.price_status === "active") {
    return !product.price || Number(product.price) <= 0;
  }
  if (!product.price || Number(product.price) <= 0) return true;
  return false;
}
