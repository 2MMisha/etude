// Accounts: who can sign in, with which roles — and creating a login, giving
// it a new password or a new email. Names, roles and active/inactive are plain
// database changes (the database refuses what isn't allowed; the controls are
// only switched off to match). The three things that need the project's secret
// key go through the "accounts" Edge Function (supabase/functions/accounts/).
import { t, getLang, type Key } from '../i18n';
import { pick } from '../forms';
import { db, h, get, ok, nav, input, checkbox, flash, state, type Profile, type Row, keep, nameIn } from '../ui';

const ROLES = ['owner', 'admin', 'trainer', 'client'] as const;

/** Ask the accounts function to do something; true when it did, else its reason on screen. */
async function account(body: Record<string, unknown>): Promise<boolean> {
  const { error } = await db!.functions.invoke('accounts', { body });
  if (!error) {
    flash(t('saved'));
    return true;
  }
  // A refusal comes back with the function's own words; anything else means it isn't installed or reachable.
  const said = await (error as { context?: Response }).context?.json?.().catch(() => null);
  flash(said?.error ?? t('accountsOffline'), true);
  return false;
}

export async function accountsView() {
  const me = state.me!;
  const [profiles, clients, trainers] = await Promise.all([
    get<Profile[]>(db!.from('profiles').select('id, email, full_name, lang, roles, active').order('created_at')),
    get<Row[]>(db!.from('clients').select('id, full_name, full_name_en, user_id').not('user_id', 'is', null)),
    get<Row[]>(db!.from('trainers').select('id, full_name, full_name_en, user_id').not('user_id', 'is', null)),
  ]);
  const say = (ru: string, he: string, en: string) => pick({ ru, he, en }, getLang());
  /** What a login belongs to: the client (family) and/or the trainer it is linked with. */
  const linked = (p: Profile) => [
    ...clients.filter((c) => c.user_id === p.id).map((c) => h('a', { href: `#/client/${c.id}/reg`, textContent: `${t('client')}: ${nameIn(c)}` })),
    ...trainers.filter((x) => x.user_id === p.id).map((x) => h('a', { href: '#/settings', textContent: `${t('trainer')}: ${x.full_name}` })),
  ];
  const iAmOwner = me.roles.includes('owner');
  const save = async (p: Profile, patch: Partial<Profile>) => {
    const done = await ok(db!.from('profiles').update(patch).eq('id', p.id));
    if (done) Object.assign(p, patch);
    return done;
  };

  const row = (p: Profile) => {
    const locked = p.roles.includes('owner') && !iAmOwner;
    const tools = h('td', { className: 'actions' });
    /** Swap the two buttons for one field and a confirm button. */
    const ask = (label: Key, type: string, send: (value: string) => Promise<boolean>) => {
      const field = h('input', { type, placeholder: t(label), ariaLabel: t(label), autocomplete: 'off', dir: 'ltr' });
      tools.replaceChildren(h('div', { className: 'row' }, field, h('button', { type: 'button', className: 'primary', textContent: t('save'), onclick: async () => {
        if (field.value.trim() && (await send(field.value.trim()))) nav.refresh();
      } })));
      field.focus();
    };
    if (!locked) tools.append(
      h('button', { type: 'button', textContent: t('newPasswordFor'), onclick: () => ask('newPassword', 'text', (v) => account({ action: 'password', user_id: p.id, password: v })) }),
      h('button', { type: 'button', textContent: t('changeEmail'), onclick: () => ask('email', 'email', (v) => account({ action: 'email', user_id: p.id, email: v })) })
    );
    const tr = h('tr', { className: p.active ? '' : 'off' },
      h('td', {}, input(p.full_name, (v) => save(p, { full_name: v }), { disabled: locked, ariaLabel: t('name') }), h('small', { dir: 'ltr' }, p.email)),
      h('td', {}, h('div', { className: 'chips' }, ...ROLES.map((r) => {
        // An owner does not switch off their own Owner role (the database also refuses it for the last owner).
        const b = h('button', { type: 'button', textContent: t(r as Key), ariaPressed: String(p.roles.includes(r)), disabled: locked || (r === 'owner' && (!iAmOwner || p.id === me.id)), onclick: async () => {
          const roles = p.roles.includes(r) ? p.roles.filter((x) => x !== r) : [...p.roles, r];
          if (await save(p, { roles })) b.ariaPressed = String(roles.includes(r));
        } });
        return b;
      }))),
      h('td', {}, h('div', { className: 'stack' }, ...linked(p))),
      h('td', {}, checkbox(p.active, async (v, el) => {
        if (await save(p, { active: v })) tr.className = v ? '' : 'off';
        else el.checked = p.active;
      }, { disabled: locked || p.id === me.id, ariaLabel: t('active') })),
      tools
    );
    return tr;
  };

  // Search by name, email or what the login is linked to (family logins make the list long).
  const rows = profiles.map((p) => ({ tr: row(p), text: `${p.full_name} ${p.email} ${linked(p).map((a) => a.textContent).join(' ')}`.toLowerCase() }));
  const body = h('tbody', {}, ...rows.map((r) => r.tr));
  const search = h('input', { type: 'search', placeholder: say('Поиск по имени или почте', 'חיפוש לפי שם או אימייל', 'Search by name or email') });
  search.oninput = () => rows.forEach((r) => (r.tr.hidden = !r.text.includes(search.value.trim().toLowerCase())));
  keep('accounts.search', search);
  search.dispatchEvent(new Event('input'));

  // A new login: the email they sign in with, a first password to hand them, a name and what they may do.
  const email = h('input', { type: 'email', placeholder: t('email'), required: true, autocomplete: 'off', dir: 'ltr' });
  const password = h('input', { type: 'text', placeholder: t('firstPassword'), required: true, minLength: 8, autocomplete: 'off', dir: 'ltr' });
  const name = h('input', { type: 'text', placeholder: t('name'), required: true });
  const chosen = new Set<string>();
  const roleButtons = ROLES.filter((r) => r !== 'owner' || iAmOwner).map((r) => {
    const b = h('button', { type: 'button', textContent: t(r as Key), ariaPressed: 'false', onclick: () => {
      chosen.has(r) ? chosen.delete(r) : chosen.add(r);
      b.ariaPressed = String(chosen.has(r));
    } });
    return b;
  });
  const form = h('form', { className: 'stack' },
    h('h2', { textContent: t('newAccount') }),
    h('div', { className: 'row' }, name, email, password),
    h('div', { className: 'chips' }, ...roleButtons),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('newAccount') }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (await account({ action: 'create', email: email.value.trim(), password: password.value, full_name: name.value.trim(), roles: [...chosen] })) nav.refresh();
  };

  return h('div', { className: 'stack' },
    h('section', { className: 'card' },
      h('h1', { textContent: t('accounts') }),
      search,
      h('div', { className: 'scroll' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('roles')), h('th', {}, say('Связан с', 'מקושר ל', 'Linked to')), h('th', {}, t('active')), h('th'))),
        body
      )),
      h('p', { className: 'muted', textContent: t('accountsHint') })
    ),
    h('section', { className: 'card' }, form)
  );
}
