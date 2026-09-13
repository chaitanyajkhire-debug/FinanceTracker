export type MutualFund = {
  id: string;
  user_id: string;
  scheme_code: string;
  scheme_name: string;
  folio_number: string | null;
  category: string | null;
  units: number;
  avg_cost_per_unit: number;
  purchase_date: string | null;
  current_nav: number | null;
  current_nav_date: string | null;
  previous_nav: number | null;
  created_at: string;
  updated_at: string;
};

export type Stock = {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string;
  sector: string | null;
  quantity: number;
  avg_price: number;
  purchase_date: string | null;
  current_price: number | null;
  current_price_date: string | null;
  previous_close: number | null;
  created_at: string;
  updated_at: string;
};

export type NpsScheme = {
  id: string;
  user_id: string;
  pran: string | null;
  scheme_name: string;
  fund_manager: string | null;
  tier: "Tier I" | "Tier II";
  asset_class: "E" | "C" | "G" | "A" | null;
  units: number;
  avg_cost_per_unit: number;
  current_nav: number | null;
  current_nav_date: string | null;
  created_at: string;
  updated_at: string;
};

export type DailySnapshot = {
  id: string;
  user_id: string;
  snapshot_date: string;
  mutual_funds_value: number;
  stocks_value: number;
  nps_value: number;
  total_value: number;
  total_invested: number;
  created_at: string;
};

export type RefreshLog = {
  id: string;
  user_id: string;
  run_at: string;
  status: "success" | "partial" | "failed";
  mf_updated: number;
  mf_failed: number;
  stocks_updated: number;
  stocks_failed: number;
  message: string | null;
};

export type HealthProfile = {
  user_id: string;
  height_cm: number | null;
  sex: "male" | "female" | null;
  birth_date: string | null;
  goal_weight_kg: number | null;
  activity_level:
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "very_active"
    | null;
  units: "metric" | "imperial" | null;
  created_at: string;
  updated_at: string;
};

export type WeightEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  waist_cm: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};
