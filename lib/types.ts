// Shared domain types. Money is always integer rupiah (IDR has no cents).

export type Size = "S" | "M" | "L" | "XL";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "expired"
  | "refunded";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
};

export interface ProductVariant {
  id: string;
  product_id: string;
  size: Size;
  price: number | null;
  stock: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  detail_image_url: string | null;
  weight_grams: number;
  is_active: boolean;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  province_code: string;
  province_name: string;
  city_name: string;
  address_line: string;
  is_admin: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  product_id: string;
  product_name: string;
  size: Size;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: string;
  user_id: string;
  midtrans_order_id: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  gross_amount: number;
  promo_code_id: string | null;
  ship_full_name: string;
  ship_phone: string;
  ship_province_code: string;
  ship_province_name: string;
  ship_city_name: string;
  ship_address_line: string;
  payment_method: string | null;
  midtrans_txn_status: string | null;
  snap_token: string | null;
  snap_redirect_url: string | null;
  tracking_number: string | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PromoType = "percentage" | "fixed";

export interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  total_usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

// Cart item as stored client-side (localStorage). Prices are re-validated server-side.
export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  size: Size;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
}
