const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function formatINR(value: number, precise = false): string {
  return (precise ? inrPrecise : inr).format(value);
}

export function formatNumber(value: number): string {
  return num.format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function gainLoss(current: number, invested: number) {
  const abs = current - invested;
  const pct = invested > 0 ? (abs / invested) * 100 : 0;
  return { abs, pct };
}
