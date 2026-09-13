/**
 * Weight-loss maths: BMI, healthy ranges, energy expenditure, trend smoothing
 * and goal projection. Everything here is pure and works in metric (kg / cm) —
 * conversion to the user's display units happens at the edges.
 */

export type Units = "metric" | "imperial";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  factor: number;
  hint: string;
}[] = [
  { value: "sedentary", label: "Sedentary", factor: 1.2, hint: "Desk job, little exercise" },
  { value: "light", label: "Lightly active", factor: 1.375, hint: "Light exercise 1–3 days/week" },
  { value: "moderate", label: "Moderately active", factor: 1.55, hint: "Exercise 3–5 days/week" },
  { value: "active", label: "Very active", factor: 1.725, hint: "Hard exercise 6–7 days/week" },
  { value: "very_active", label: "Athlete", factor: 1.9, hint: "Twice-a-day training, physical job" },
];

/** ~7,700 kcal is commonly used as the energy content of a kilo of body fat. */
export const KCAL_PER_KG = 7700;

const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const cmToIn = (cm: number) => cm / CM_PER_INCH;
export const inToCm = (inches: number) => inches * CM_PER_INCH;

export function weightUnit(units: Units): string {
  return units === "imperial" ? "lb" : "kg";
}

/** Displays a stored (metric) weight in the user's preferred unit. */
export function displayWeight(kg: number, units: Units, digits = 1): string {
  const value = units === "imperial" ? kgToLb(kg) : kg;
  return `${value.toFixed(digits)} ${weightUnit(units)}`;
}

/** Same, but signed — for deltas like "-2.4 kg". */
export function displayDelta(kg: number, units: Units, digits = 1): string {
  const value = units === "imperial" ? kgToLb(kg) : kg;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)} ${weightUnit(units)}`;
}

/** Height as "5′ 9″" or "175 cm". */
export function displayHeight(cm: number, units: Units): string {
  if (units === "imperial") {
    const totalInches = cmToIn(cm);
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    return inches === 12 ? `${feet + 1}′ 0″` : `${feet}′ ${inches}″`;
  }
  return `${cm.toFixed(0)} cm`;
}

// ---------------------------------------------------------------------------
// BMI
// ---------------------------------------------------------------------------

export type BmiBand = {
  key: string;
  label: string;
  min: number;
  max: number;
  color: string;
};

/** WHO international BMI bands. `max` is exclusive. */
export const BMI_BANDS: BmiBand[] = [
  { key: "under", label: "Underweight", min: 0, max: 18.5, color: "#38bdf8" },
  { key: "normal", label: "Healthy", min: 18.5, max: 25, color: "#34d399" },
  { key: "over", label: "Overweight", min: 25, max: 30, color: "#fbbf24" },
  { key: "obese1", label: "Obese I", min: 30, max: 35, color: "#fb923c" },
  { key: "obese2", label: "Obese II", min: 35, max: 40, color: "#f87171" },
  { key: "obese3", label: "Obese III", min: 40, max: Infinity, color: "#e11d48" },
];

export const HEALTHY_BMI_MIN = 18.5;
export const HEALTHY_BMI_MAX = 24.9;

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiBand(value: number): BmiBand {
  return BMI_BANDS.find((b) => value >= b.min && value < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1];
}

/** Weight range (kg) that puts this height inside the healthy BMI band. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } | null {
  if (!heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  return { min: HEALTHY_BMI_MIN * m * m, max: HEALTHY_BMI_MAX * m * m };
}

/** Weight (kg) that would produce a given BMI at this height. */
export function weightForBmi(targetBmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return targetBmi * m * m;
}

// ---------------------------------------------------------------------------
// Energy expenditure
// ---------------------------------------------------------------------------

/** Mifflin–St Jeor basal metabolic rate, the current clinical default. */
export function bmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: "male" | "female",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export function activityFactor(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((a) => a.value === level)?.factor ?? 1.2;
}

export function tdee(bmrValue: number, level: ActivityLevel): number {
  return bmrValue * activityFactor(level);
}

export function ageFrom(birthDate: string, on = new Date()): number {
  const born = new Date(birthDate);
  let age = on.getFullYear() - born.getFullYear();
  const monthDiff = on.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getDate() < born.getDate())) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Series helpers
// ---------------------------------------------------------------------------

export type Point = { date: string; weightKg: number };

export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Exponentially weighted moving average — the smoothed "trend weight" that
 * cuts through day-to-day water-weight noise. `halfLifeDays` of 7 means a
 * reading loses half its influence after a week.
 */
export function trendLine(points: Point[], halfLifeDays = 7): number[] {
  const alpha = 1 - Math.pow(0.5, 1 / halfLifeDays);
  const out: number[] = [];
  let ema: number | null = null;

  for (const point of points) {
    ema = ema === null ? point.weightKg : ema + alpha * (point.weightKg - ema);
    out.push(ema);
  }
  return out;
}

/** Mean weight over the `days` window ending at the last entry. */
export function averageOverLastDays(points: Point[], days: number): number | null {
  if (points.length === 0) return null;
  const end = points[points.length - 1].date;
  const cutoff = addDays(end, -(days - 1));
  const window = points.filter((p) => p.date >= cutoff);
  if (window.length === 0) return null;
  return window.reduce((sum, p) => sum + p.weightKg, 0) / window.length;
}

/**
 * Least-squares slope in kg/day over the trailing `days` window. Uses at least
 * two points spread over time, otherwise there is no meaningful rate.
 */
export function ratePerDay(points: Point[], days = 28): number | null {
  if (points.length < 2) return null;
  const end = points[points.length - 1].date;
  const cutoff = addDays(end, -days);
  const window = points.filter((p) => p.date >= cutoff);
  if (window.length < 2) return null;

  const xs = window.map((p) => daysBetween(window[0].date, p.date));
  const ys = window.map((p) => p.weightKg);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Projected date of reaching `goalKg` if the current rate holds. Returns null
 * when the goal is already met, or the trend is flat or moving away from it.
 */
export function projectGoalDate(
  latest: Point,
  goalKg: number,
  kgPerDay: number | null,
): { date: string; days: number } | null {
  if (kgPerDay === null || kgPerDay === 0) return null;
  const remaining = goalKg - latest.weightKg;
  if (Math.abs(remaining) < 0.05) return null;
  // Rate has to point towards the goal.
  if (Math.sign(remaining) !== Math.sign(kgPerDay)) return null;

  const days = Math.ceil(remaining / kgPerDay);
  if (!Number.isFinite(days) || days <= 0 || days > 365 * 5) return null;
  return { date: addDays(latest.date, days), days };
}

/** Consecutive days logged, counting back from today (or yesterday). */
export function loggingStreak(points: Point[], today = todayIso()): number {
  if (points.length === 0) return 0;
  const dates = new Set(points.map((p) => p.date));

  let cursor = dates.has(today) ? today : addDays(today, -1);
  if (!dates.has(cursor)) return 0;

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Groups entries into ISO weeks and returns the change across each week. */
export function weeklyChanges(
  points: Point[],
): { weekStart: string; changeKg: number; avgKg: number }[] {
  if (points.length < 2) return [];

  const buckets = new Map<string, Point[]>();
  for (const point of points) {
    const date = new Date(`${point.date}T00:00:00Z`);
    // Monday-based week start.
    const offset = (date.getUTCDay() + 6) % 7;
    const weekStart = addDays(point.date, -offset);
    const bucket = buckets.get(weekStart);
    if (bucket) bucket.push(point);
    else buckets.set(weekStart, [point]);
  }

  const weeks = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, entries]) => ({
      weekStart,
      avgKg: entries.reduce((sum, e) => sum + e.weightKg, 0) / entries.length,
    }));

  return weeks.map((week, i) => ({
    weekStart: week.weekStart,
    avgKg: week.avgKg,
    changeKg: i === 0 ? 0 : week.avgKg - weeks[i - 1].avgKg,
  }));
}

/**
 * Everything the dashboard needs, derived once from the raw entries so the
 * page and the charts always agree.
 */
export type WeightInsights = {
  points: Point[];
  trend: number[];
  latest: Point | null;
  previous: Point | null;
  start: Point | null;
  lowest: Point | null;
  highest: Point | null;
  dayChangeKg: number | null;
  totalChangeKg: number | null;
  avg7: number | null;
  avg30: number | null;
  kgPerDay: number | null;
  kgPerWeek: number | null;
  dailyKcalGap: number | null;
  streak: number;
  weeks: { weekStart: string; changeKg: number; avgKg: number }[];
};

export function buildInsights(points: Point[]): WeightInsights {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1] ?? null;
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const start = sorted[0] ?? null;

  const kgPerDay = ratePerDay(sorted);
  const kgPerWeek = kgPerDay === null ? null : kgPerDay * 7;

  return {
    points: sorted,
    trend: trendLine(sorted),
    latest,
    previous,
    start,
    lowest: sorted.reduce<Point | null>(
      (min, p) => (min === null || p.weightKg < min.weightKg ? p : min),
      null,
    ),
    highest: sorted.reduce<Point | null>(
      (max, p) => (max === null || p.weightKg > max.weightKg ? p : max),
      null,
    ),
    dayChangeKg: latest && previous ? latest.weightKg - previous.weightKg : null,
    totalChangeKg: latest && start && latest !== start ? latest.weightKg - start.weightKg : null,
    avg7: averageOverLastDays(sorted, 7),
    avg30: averageOverLastDays(sorted, 30),
    kgPerDay,
    kgPerWeek,
    dailyKcalGap: kgPerDay === null ? null : kgPerDay * KCAL_PER_KG,
    streak: loggingStreak(sorted),
    weeks: weeklyChanges(sorted),
  };
}
