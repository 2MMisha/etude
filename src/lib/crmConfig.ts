// The CRM's database (Supabase): project URL and its publishable ("anon") key.
// Both are public by design — they ship in the page like the OneSignal app
// ids — and grant nothing by themselves: every table is behind a login and the
// access rules in supabase/migrations/. Never put the secret/service key or
// the database password here.
// Empty = /crm/ says it isn't connected yet.
export const SUPABASE_URL = 'https://lilignwfbznhkoxdvcau.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Vef08Ivt3xxB0JMHnjttUQ_p6v507eY';
