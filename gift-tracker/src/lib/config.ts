/**
 * Supabase connection details for the gift board.
 *
 * These are the project URL and the *publishable* key — the key Supabase
 * designs to ship inside browser bundles. It is not a secret: what the key
 * can do is decided by the Row Level Security policies in
 * `supabase/migrations/0001_gifts.sql`, which grant access to the `gifts`
 * table and nothing else. The board is deliberately open to anyone with the
 * link, so no further gate sits in front of it.
 *
 * Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to
 * point a deployment at a different project.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://tpxqctghqcgdhatimlda.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_PhO95JNYEF2CaqulCuEsCw_jTa4gose";

/** How many gifts the party is aiming for. */
export const GIFT_GOAL = 40;
