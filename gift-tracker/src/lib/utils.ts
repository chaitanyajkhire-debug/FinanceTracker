export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Trim a form field down to a value the database will accept, or null. */
export function optionalText(value: string, maxLength: number): string | null {
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Formatted in UTC so the server and the browser always agree. */
export function formatDay(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dayFormatter.format(date);
}
