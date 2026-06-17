// Formatting helpers.

/** Format integer rupiah as "Rp 188.000". */
export function formatRupiah(amount: number): string {
  const n = Math.round(amount || 0);
  return "Rp " + n.toLocaleString("id-ID");
}

/** Format an ISO timestamp as a readable local date-time (WIB-friendly). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
