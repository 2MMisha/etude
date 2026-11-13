// Supabase Edge Function "accounts": the one piece of the CRM that runs on a
// server, because creating a login, resetting a password or changing an email
// needs the project's secret key, which must never be in a web page.
//
// The CRM's Accounts screen calls it with the signed-in person's token. The
// function works out who that is, checks they are staff (owner or admin), and
// only then acts. An admin cannot touch an owner's account or make an owner.
//
// Installed by pasting this file into Supabase, Edge Functions (see info.md).
// It holds no secrets itself: the URL and the secret key come from the
// project's own environment.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ROLES = ['owner', 'admin', 'trainer', 'client'];
const ALLOWED_ORIGINS = ['https://etude.ristar.co', 'http://localhost:4321', 'http://localhost:4322'];

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('Origin')), 'Content-Type': 'application/json' };
  const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply(405, { error: 'POST only' });

  // Who is asking? Their token says; their profile says what they may do.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return reply(401, { error: 'Sign in first.' });
  const { data: me } = await admin.from('profiles').select('roles, active').eq('id', who.user.id).single();
  const mine: string[] = me?.active ? me.roles : [];
  const iAmOwner = mine.includes('owner');
  if (!iAmOwner && !mine.includes('admin')) return reply(403, { error: 'Only staff can manage accounts.' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'Bad request.' });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 120;

  /** An admin may not act on an owner's account. */
  const mayTouch = async (userId: string) => {
    const { data } = await admin.from('profiles').select('roles').eq('id', userId).single();
    if (!data) return 'No such account.';
    if (data.roles.includes('owner') && !iAmOwner) return "Only an owner can change an owner's account.";
    return null;
  };

  if (body.action === 'create') {
    const roles = Array.isArray(body.roles) ? body.roles.map(String).filter((r) => ROLES.includes(r)) : [];
    if (!emailOk) return reply(400, { error: 'That email does not look right.' });
    if (password.length < 8) return reply(400, { error: 'The password needs at least 8 characters.' });
    if (roles.includes('owner') && !iAmOwner) return reply(403, { error: 'Only an owner can make another owner.' });
    const fullName = String(body.full_name ?? '').trim().slice(0, 120);
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !data.user) return reply(400, { error: error?.message ?? 'Could not create the account.' });
    // The profile row is made by the database when the login appears; give it its name and roles.
    const { error: profileError } = await admin.from('profiles').update({ full_name: fullName, roles }).eq('id', data.user.id);
    if (profileError) return reply(500, { error: profileError.message });
    return reply(200, { id: data.user.id });
  }

  const userId = String(body.user_id ?? '');
  if (body.action === 'password') {
    if (password.length < 8) return reply(400, { error: 'The password needs at least 8 characters.' });
    const refused = await mayTouch(userId);
    if (refused) return reply(403, { error: refused });
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    return error ? reply(400, { error: error.message }) : reply(200, { ok: true });
  }

  if (body.action === 'email') {
    if (!emailOk) return reply(400, { error: 'That email does not look right.' });
    const refused = await mayTouch(userId);
    if (refused) return reply(403, { error: refused });
    const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return reply(400, { error: error.message });
    // Keep the copy the Accounts screen shows in step with the login.
    await admin.from('profiles').update({ email }).eq('id', userId);
    return reply(200, { ok: true });
  }

  return reply(400, { error: 'Unknown action.' });
});
