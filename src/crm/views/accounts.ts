// Accounts: who can sign in, with which roles — and creating a login, giving
// it a new password or a new email. Names, roles and active/inactive are plain
// database changes (the database refuses what isn't allowed; the controls are
// only switched off to match). The three things that need the project's secret
// key go through the "accounts" Edge Function (supabase/functions/accounts/).
import { t, type Key } from '../i18n';
import { db, h, get, ok, nav, input, checkbox, flash, state, type Profile } from '../ui';

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
  const profiles = await get<Profile[]>(db!.from('profiles').select('id, email, full_name, lang, roles, active').order('created_at'));
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
      h('td', {}, checkbox(p.active, async (v, el) => {
        if (await save(p, { active: v })) tr.className = v ? '' : 'off';
        else el.checked = p.active;
      }, { disabled: locked || p.id === me.id, ariaLabel: t('active') })),
      tools
    );
    return tr;
  };

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
      h('div', { className: 'scroll' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('roles')), h('th', {}, t('active')), h('th'))),
        h('tbody', {}, ...profiles.map(row))
      )),
      h('p', { className: 'muted', textContent: t('accountsHint') })
    ),
    h('section', { className: 'card' }, form)
  );
}
