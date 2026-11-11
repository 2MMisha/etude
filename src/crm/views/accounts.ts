// Accounts: who can sign in, with which roles. The database refuses what
// isn't allowed; the controls are only switched off to match.
import { t, type Key } from '../i18n';
import { db, h, get, ok, input, checkbox, state, type Profile } from '../ui';

const ROLES = ['owner', 'admin', 'trainer', 'client'] as const;

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
    const tr = h('tr', { className: p.active ? '' : 'off' },
      h('td', {}, input(p.full_name, (v) => save(p, { full_name: v }), { disabled: locked, ariaLabel: t('name') }), h('small', { dir: 'ltr' }, p.email)),
      h('td', {}, h('div', { className: 'chips' }, ...ROLES.map((r) => {
        const b = h('button', { type: 'button', textContent: t(r as Key), ariaPressed: String(p.roles.includes(r)), disabled: locked || (r === 'owner' && !iAmOwner), onclick: async () => {
          const roles = p.roles.includes(r) ? p.roles.filter((x) => x !== r) : [...p.roles, r];
          if (await save(p, { roles })) b.ariaPressed = String(roles.includes(r));
        } });
        return b;
      }))),
      h('td', {}, checkbox(p.active, async (v, el) => {
        if (await save(p, { active: v })) tr.className = v ? '' : 'off';
        else el.checked = p.active;
      }, { disabled: locked || p.id === me.id, ariaLabel: t('active') }))
    );
    return tr;
  };
  return h('section', { className: 'card' },
    h('h1', { textContent: t('accounts') }),
    h('div', { className: 'scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('roles')), h('th', {}, t('active')))),
      h('tbody', {}, ...profiles.map(row))
    )),
    h('p', { className: 'muted', textContent: t('accountsHint') })
  );
}
