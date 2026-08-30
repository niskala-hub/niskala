export type ProductStatus = "ready" | "coming_soon" | "sold";

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
