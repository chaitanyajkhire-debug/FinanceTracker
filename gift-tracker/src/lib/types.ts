export type Gift = {
  id: string;
  title: string;
  note: string | null;
  buyer: string | null;
  bought: boolean;
  bought_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The fields a person can actually set from the UI. */
export type GiftDraft = {
  title: string;
  buyer: string | null;
  note: string | null;
};
