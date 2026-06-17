import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
