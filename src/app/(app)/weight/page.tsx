import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import {
  ACTIVITY_LEVELS,
  ageFrom,
  bmi,
  bmiBand,
  bmr,
  buildInsights,
  displayDelta,
  cmToIn,
  displayHeight,
  healthyWeightRange,
  kgToLb,
  projectGoalDate,
  tdee,
  todayIso,
  weightUnit,
  type Point,
  type Units,
} from "@/lib/health";
import { BmiScale, GoalRing } from "@/components/weight/goal-ring";
import { ProgressChart, WeeklyChangeChart } from "@/components/weight/weight-charts";
import type { HealthProfile, WeightEntry } from "@/lib/supabase/types";
import { History } from "./history";
import { LogWeightForm } from "./log-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Weight — FinanceTracker",
  description: "Daily weight log, BMI and progress insights",
};

export default async function WeightPage() {
  const supabase = await createClient();

  const [{ data: profileRow }, { data: entryRows }] = await Promise.all([
    supabase.from("health_profiles").select("*").maybeSingle(),
    supabase
      .from("weight_entries")
      .select("*")
      .order("entry_date", { ascending: true })
      .limit(1000),
  ]);

  const profile = (profileRow ?? null) as HealthProfile | null;
  const entries = ((entryRows ?? []) as WeightEntry[]).map((entry) => ({
    ...entry,
    weight_kg: Number(entry.weight_kg),
    body_fat_pct: entry.body_fat_pct == null ? null : Number(entry.body_fat_pct),
    waist_cm: entry.waist_cm == null ? null : Number(entry.waist_cm),
  }));

  const units: Units = profile?.units === "imperial" ? "imperial" : "metric";
  const unit = weightUnit(units);
  const toDisplay = (kg: number) => (units === "imperial" ? kgToLb(kg) : kg);
  const show = (kg: number, digits = 1) => toDisplay(kg).toFixed(digits);

  const points: Point[] = entries.map((entry) => ({
    date: entry.entry_date,
    weightKg: entry.weight_kg,
  }));
  const insights = buildInsights(points);
  const { latest, start, lowest, highest } = insights;

  const heightCm = profile?.height_cm == null ? null : Number(profile.height_cm);
  const goalKg = profile?.goal_weight_kg == null ? null : Number(profile.goal_weight_kg);

  const currentBmi = latest && heightCm ? bmi(latest.weightKg, heightCm) : null;
  const goalBmi = goalKg && heightCm ? bmi(goalKg, heightCm) : null;
  const healthy = heightCm ? healthyWeightRange(heightCm) : null;

  // Progress runs from the first logged weight to the goal.
  const goalSpan = start && goalKg !== null ? start.weightKg - goalKg : null;
  const goalProgress =
    latest && start && goalSpan !== null && Math.abs(goalSpan) > 0.001
      ? (start.weightKg - latest.weightKg) / goalSpan
      : null;
  const remainingKg = latest && goalKg !== null ? latest.weightKg - goalKg : null;
  const goalReached = remainingKg !== null && remainingKg <= 0.05;

  const projection =
    latest && goalKg !== null && !goalReached
      ? projectGoalDate(latest, goalKg, insights.kgPerDay)
      : null;

  // BMR/TDEE need the full profile; they stay hidden until it's filled in.
  const age = profile?.birth_date ? ageFrom(profile.birth_date) : null;
  const bmrValue =
    latest && heightCm && age !== null && age > 0 && profile?.sex
      ? bmr(latest.weightKg, heightCm, age, profile.sex)
      : null;
  const tdeeValue =
    bmrValue === null ? null : tdee(bmrValue, profile?.activity_level ?? "sedentary");
  const activityLabel = ACTIVITY_LEVELS.find(
    (level) => level.value === (profile?.activity_level ?? "sedentary"),
  )?.label;

  const chartData = insights.points.map((point, index) => ({
    date: point.date,
    weight: Number(toDisplay(point.weightKg).toFixed(2)),
    trend: Number(toDisplay(insights.trend[index]).toFixed(2)),
  }));

  const weeklyData = insights.weeks
    .slice(1)
    .map((week) => ({ week: week.weekStart, change: Number(toDisplay(week.changeKg).toFixed(2)) }));

  // Optional body-composition measurements, shown only once they exist.
  const fatEntries = entries.filter((entry) => entry.body_fat_pct != null);
  const waistEntries = entries.filter((entry) => entry.waist_cm != null);
  const latestFat = fatEntries[fatEntries.length - 1];
  const latestWaist = waistEntries[waistEntries.length - 1];
  const fatDelta =
    fatEntries.length > 1 ? latestFat.body_fat_pct! - fatEntries[0].body_fat_pct! : null;
  const waistDelta =
    waistEntries.length > 1 ? latestWaist.waist_cm! - waistEntries[0].waist_cm! : null;
  const waistUnit = units === "imperial" ? "in" : "cm";
  const showLength = (cm: number) => (units === "imperial" ? cmToIn(cm) : cm).toFixed(1);

  const last30 = points.filter((point) => point.date >= isoDaysAgo(29)).length;
  const consistency = Math.round((Math.min(last30, 30) / 30) * 100);

  const weeklyRate = insights.kgPerWeek;
  const losing = weeklyRate !== null && weeklyRate < -0.02;
  const gaining = weeklyRate !== null && weeklyRate > 0.02;

  return (
    <div className="relative">
      <div className="aurora" />
      <div className="grid-veil" />

      <div className="relative z-10 space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Weight <span className="neon-text">Journey</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {latest
                ? `Last weigh-in ${formatDate(latest.date)}${
                    heightCm ? ` · ${displayHeight(heightCm, units)}` : ""
                  }`
                : "Log your first weigh-in to start tracking"}
            </p>
          </div>
          {insights.streak > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
              🔥 {insights.streak}-day logging streak
            </span>
          )}
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Hero: current weight, goal ring, quick log                        */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="glass rise-in relative overflow-hidden p-6 lg:col-span-2">
            <div className="sheen" />
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">
                  Current weight
                </div>
                <div className="tabular neon-text mt-2 text-6xl font-semibold leading-none">
                  {latest ? show(latest.weightKg) : "—"}
                  <span className="ml-2 text-2xl font-normal text-slate-400">{unit}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {insights.dayChangeKg !== null && (
                    <Chip
                      tone={insights.dayChangeKg <= 0 ? "good" : "warn"}
                      label={`${displayDelta(insights.dayChangeKg, units, 2)} since last`}
                    />
                  )}
                  {insights.totalChangeKg !== null && start && (
                    <Chip
                      tone={insights.totalChangeKg <= 0 ? "good" : "warn"}
                      label={`${displayDelta(insights.totalChangeKg, units)} since ${formatDate(start.date)}`}
                    />
                  )}
                  {insights.avg7 !== null && (
                    <Chip tone="muted" label={`7-day avg ${show(insights.avg7)} ${unit}`} />
                  )}
                </div>
              </div>

              {goalKg !== null && goalProgress !== null ? (
                <GoalRing
                  progress={goalProgress}
                  label={`${Math.max(0, Math.min(100, Math.round(goalProgress * 100)))}%`}
                  caption={
                    goalReached
                      ? `Goal of ${show(goalKg)} ${unit} reached 🎉`
                      : `${show(Math.abs(remainingKg ?? 0))} ${unit} to go · goal ${show(goalKg)} ${unit}`
                  }
                />
              ) : (
                <div className="max-w-[15rem] rounded-xl border border-dashed border-slate-700/60 p-4 text-xs text-slate-500">
                  Set a goal weight in <span className="text-slate-300">Your details</span> to see
                  your progress ring and a projected finish date.
                </div>
              )}
            </div>

            {/* Start → now → goal track */}
            {start && goalKg !== null && goalProgress !== null && (
              <div className="relative mt-6">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400"
                    style={{ width: `${Math.max(2, Math.min(100, goalProgress * 100))}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>
                    Start {show(start.weightKg)} {unit} · {formatDate(start.date)}
                  </span>
                  <span>
                    Goal {show(goalKg)} {unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="glass rise-in p-5" style={{ animationDelay: "60ms" }}>
            <LogWeightForm
              units={units}
              today={todayIso()}
              lastWeight={latest ? Number(toDisplay(latest.weightKg).toFixed(1)) : null}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Headline metrics                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            delay={0}
            label="BMI"
            value={currentBmi ? currentBmi.toFixed(1) : "—"}
            sub={
              currentBmi
                ? bmiBand(currentBmi).label
                : heightCm
                  ? "Log a weight"
                  : "Add your height"
            }
            accent={currentBmi ? bmiBand(currentBmi).color : undefined}
          />
          <StatTile
            delay={60}
            label="Weekly rate"
            value={weeklyRate === null ? "—" : `${weeklyRate > 0 ? "+" : ""}${toDisplay(weeklyRate).toFixed(2)}`}
            sub={weeklyRate === null ? "Needs a few days" : `${unit} / week (4-wk trend)`}
            accent={losing ? "#34d399" : gaining ? "#fbbf24" : undefined}
          />
          <StatTile
            delay={120}
            label="Total change"
            value={insights.totalChangeKg === null ? "—" : displayDelta(insights.totalChangeKg, units)}
            sub={start ? `since ${formatDate(start.date)}` : "one entry so far"}
            accent={
              insights.totalChangeKg === null
                ? undefined
                : insights.totalChangeKg <= 0
                  ? "#34d399"
                  : "#fbbf24"
            }
          />
          <StatTile
            delay={180}
            label="Lowest logged"
            value={lowest ? `${show(lowest.weightKg)}` : "—"}
            sub={lowest ? formatDate(lowest.date) : "—"}
            accent="#22d3ee"
          />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Charts                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="glass p-5 lg:col-span-2">
            <ProgressChart
              data={chartData}
              unit={unit}
              goal={goalKg === null ? null : Number(toDisplay(goalKg).toFixed(1))}
              healthyMin={healthy ? Number(toDisplay(healthy.min).toFixed(1)) : null}
              healthyMax={healthy ? Number(toDisplay(healthy.max).toFixed(1)) : null}
            />
          </div>

          <div className="glass p-5">
            {currentBmi ? (
              <>
                <BmiScale value={currentBmi} />
                {healthy && (
                  <dl className="mt-6 space-y-2.5 border-t border-slate-800/70 pt-4 text-xs">
                    <Row
                      term="Healthy range"
                      value={`${show(healthy.min)} – ${show(healthy.max)} ${unit}`}
                    />
                    {goalBmi && <Row term="BMI at goal" value={goalBmi.toFixed(1)} />}
                    {latest && latest.weightKg > healthy.max && (
                      <Row
                        term="To healthy BMI"
                        value={`${show(latest.weightKg - healthy.max)} ${unit} to go`}
                      />
                    )}
                    {highest && lowest && highest.weightKg !== lowest.weightKg && (
                      <Row
                        term="Range logged"
                        value={`${show(lowest.weightKg)} – ${show(highest.weightKg)} ${unit}`}
                      />
                    )}
                    {latestFat && (
                      <Row
                        term="Body fat"
                        value={`${latestFat.body_fat_pct!.toFixed(1)}%${
                          fatDelta === null
                            ? ""
                            : ` (${fatDelta > 0 ? "+" : "−"}${Math.abs(fatDelta).toFixed(1)})`
                        }`}
                      />
                    )}
                    {latestWaist && (
                      <Row
                        term="Waist"
                        value={`${showLength(latestWaist.waist_cm!)} ${waistUnit}${
                          waistDelta === null
                            ? ""
                            : ` (${waistDelta > 0 ? "+" : "−"}${Math.abs(
                                Number(showLength(Math.abs(waistDelta))),
                              ).toFixed(1)})`
                        }`}
                      />
                    )}
                  </dl>
                )}
              </>
            ) : (
              <div className="flex h-full flex-col justify-center gap-3 text-center">
                <div className="text-4xl">📏</div>
                <p className="text-sm font-medium text-slate-200">BMI needs your height</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Add it once under <span className="text-slate-300">Your details</span> below and
                  every weigh-in gets a BMI, a healthy weight range and calorie estimates.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="glass p-5 lg:col-span-2">
            <h2 className="mb-3 text-sm font-medium text-slate-200">Week-over-week change</h2>
            <WeeklyChangeChart data={weeklyData} unit={unit} />
          </div>

          <div className="glass p-5">
            <h2 className="mb-3 text-sm font-medium text-slate-200">Consistency</h2>
            <div className="tabular text-4xl font-semibold text-slate-50">{consistency}%</div>
            <p className="mt-1 text-xs text-slate-500">
              {last30} of the last 30 days logged
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                style={{ width: `${consistency}%` }}
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Daily weigh-ins under the same conditions — first thing in the morning, after the
              bathroom, before eating — make the trend line far more reliable than the scale itself.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Derived insights                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {insights.avg7 !== null && insights.avg30 !== null && (
            <Insight
              icon="📉"
              title="Trend weight"
              body={`Your 7-day average is ${show(insights.avg7)} ${unit} against a 30-day average of ${show(
                insights.avg30,
              )} ${unit}. The gap between them, not any single morning, is the real movement.`}
            />
          )}

          {weeklyRate !== null && (
            <Insight
              icon={losing ? "🚀" : gaining ? "⚠️" : "➖"}
              title={losing ? "Rate of loss" : gaining ? "Trending up" : "Holding steady"}
              body={
                losing
                  ? `You're down about ${Math.abs(toDisplay(weeklyRate)).toFixed(2)} ${unit} per week. ${
                      Math.abs(weeklyRate) > 1
                        ? "That's faster than the 0.5–1 kg/week most guidance suggests — worth easing off to hold on to muscle."
                        : "That sits in the steady 0.5–1 kg/week band that tends to stick."
                    }`
                  : gaining
                    ? `The four-week trend is up about ${toDisplay(weeklyRate).toFixed(2)} ${unit} per week. One heavy week is noise; three in a row is a pattern worth a look.`
                    : "Your four-week trend is essentially flat — you're maintaining."
              }
            />
          )}

          {projection && goalKg !== null && (
            <Insight
              icon="🎯"
              title="Projected finish"
              body={`Holding this pace puts you at ${show(goalKg)} ${unit} around ${formatDate(
                projection.date,
              )} — about ${projection.days} day${projection.days === 1 ? "" : "s"} out.`}
            />
          )}

          {insights.dailyKcalGap !== null && Math.abs(insights.dailyKcalGap) > 40 && (
            <Insight
              icon="🔥"
              title={insights.dailyKcalGap < 0 ? "Implied deficit" : "Implied surplus"}
              body={`Your trend works out to roughly ${Math.abs(
                Math.round(insights.dailyKcalGap),
              ).toLocaleString("en-IN")} kcal per day ${
                insights.dailyKcalGap < 0 ? "below" : "above"
              } maintenance, using the ~7,700 kcal per kilo rule of thumb.`}
            />
          )}

          {bmrValue !== null && tdeeValue !== null && (
            <Insight
              icon="⚡"
              title="Energy budget"
              body={`At ${show(latest!.weightKg)} ${unit} your BMR is about ${Math.round(
                bmrValue,
              ).toLocaleString("en-IN")} kcal. Scaled for ${activityLabel?.toLowerCase()} days, maintenance lands near ${Math.round(
                tdeeValue,
              ).toLocaleString("en-IN")} kcal — a 500 kcal daily gap is roughly half a kilo a week.`}
            />
          )}

          {goalReached && (
            <Insight
              icon="🏆"
              title="Goal reached"
              body={`You're at or past your ${show(goalKg!)} ${unit} target. Maintenance is its own skill — keep logging so you catch any drift back early.`}
            />
          )}

          {highest && latest && highest.weightKg - latest.weightKg > 0.5 && (
            <Insight
              icon="📊"
              title="Off your peak"
              body={`You're ${show(highest.weightKg - latest.weightKg)} ${unit} below your logged high of ${show(
                highest.weightKg,
              )} ${unit} on ${formatDate(highest.date)}.`}
            />
          )}

          {points.length === 0 && (
            <Insight
              icon="✨"
              title="Start here"
              body="Log today's weight, then add your height under Your details. BMI, trend lines, weekly rate and a projected finish date all fill in automatically from there."
            />
          )}
        </section>

        <ProfileForm profile={profile} openByDefault={!heightCm} />

        <History entries={entries} units={units} heightCm={heightCm} />

        <p className="pb-4 text-center text-[11px] leading-relaxed text-slate-600">
          BMI, BMR and calorie figures are population-level estimates — they don&apos;t account for
          body composition, and they aren&apos;t medical advice.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational bits
// ---------------------------------------------------------------------------

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function Chip({ label, tone }: { label: string; tone: "good" | "warn" | "muted" }) {
  const classes =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-slate-700/60 bg-slate-800/40 text-slate-400";

  return (
    <span className={`tabular rounded-full border px-2.5 py-1 text-xs ${classes}`}>{label}</span>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
  delay: number;
}) {
  return (
    <div className="glass glass-hover rise-in p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[11px] uppercase tracking-widest text-slate-500">{label}</div>
      <div
        className="tabular mt-1.5 text-2xl font-semibold"
        style={{ color: accent ?? "#f1f5f9" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}

function Insight({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="glass glass-hover p-4">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-medium text-slate-100">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">{term}</dt>
      <dd className="tabular text-slate-200">{value}</dd>
    </div>
  );
}
