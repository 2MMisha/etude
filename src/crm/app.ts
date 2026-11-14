// The CRM shell: sign-in, password reset, language, navigation and routing
// (location.hash → a view function that returns the screen).
import { LANGS, getLang, setLang, storedLang, t, type Key, type Lang } from './i18n';
import { db, h, nav, state, addTableTools, type Profile } from './ui';
import { signInView, newPasswordView } from './auth';
import { clientsView, clientView } from './views/clients';
import { monthView } from './views/month';
import { settingsView } from './views/settings';
import { accountsView } from './views/accounts';
import { debtsView, receiptView, reportsView } from './views/payments';
import { trainersView } from './views/lessons';
import { scheduleView } from './views/schedule';
import { homeView } from './views/home';

const ROUTES: Record<string, (arg?: string, sub?: string) => Promise<HTMLElement>> = {
  home: homeView,
  clients: clientsView,
  client: clientView,
  month: monthView,
  lessons: scheduleView,
  trainersTab: trainersView,
  debts: debtsView,
  reports: reportsView,
  receipt: receiptView,
  settings: settingsView,
  accounts: accountsView,
};
const TABS: Key[] = ['clients', 'month', 'lessons', 'debts', 'trainersTab', 'reports', 'settings', 'accounts'];

const view = document.getElementById('view')!;
const tabs = document.getElementById('nav')!;
const signOutBtn = document.getElementById('signOut') as HTMLButtonElement;
let recovering = false;
let signedIn: string | null | undefined; // undefined = not heard from Supabase yet

const card = (key: Key) => h('p', { className: 'card sign', textContent: t(key) });
function drawChrome(current: string) {
  const me = state.me;
  const staff = !!me && me.active && (me.roles.includes('owner') || me.roles.includes('admin'));
  signOutBtn.hidden = !me;
  signOutBtn.textContent = t('signOut');
  document.getElementById('langs')!.replaceChildren(
    ...LANGS.map((l) => h('button', { type: 'button', textContent: l.toUpperCase(), ariaPressed: String(l === getLang()), onclick: () => {
      setLang(l);
      if (me) db!.from('profiles').update({ lang: l }).eq('id', me.id).then(() => {});
      render();
    } }))
  );
  tabs.hidden = !staff || recovering;
  tabs.replaceChildren(...TABS.map((k) => h('a', { href: `#/${k}`, textContent: t(k), ariaCurrent: k === current || (k === 'clients' && (current === 'client' || current === 'receipt')) ? 'page' : null })));
  return staff;
}

// The bell in the top bar: how many things wait (the "Important" screen), checked on
// sign-in, after every change and every 5 minutes; a tap opens the list.
let bellCount = 0;
async function updateBell() {
  if (!state.me || tabs.hidden) return; // staff only
  try {
    const el = await homeView();
    bellCount = Number(el.dataset.total ?? 0);
  } catch {
    return;
  }
  drawBell();
}
function drawBell() {
  const bell = document.getElementById('bell')!;
  bell.hidden = tabs.hidden;
  bell.title = bell.ariaLabel = `${t('home')}${bellCount ? `: ${bellCount}` : ''}`;
  bell.ariaCurrent = location.hash.startsWith('#/home') ? 'page' : null;
  bell.replaceChildren(h('span', { ariaHidden: 'true', textContent: '🔔' }), ...(bellCount > 0 ? [h('b', { textContent: bellCount > 99 ? '99+' : String(bellCount) })] : []));
}
setInterval(updateBell, 5 * 60 * 1000);

async function render() {
  const [name = '', arg, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const route = name in ROUTES ? name : 'clients';
  const staff = drawChrome(route);
  if (!db) return view.replaceChildren(card('notConnected'));
  if (recovering) return view.replaceChildren(newPasswordView(() => { recovering = false; render(); }));
  if (!state.me) return view.replaceChildren(signInView());
  if (!staff) return view.replaceChildren(card('noAccess'));
  try {
    view.replaceChildren(await ROUTES[route](arg, sub));
    if (route === 'home') bellCount = Number(view.firstElementChild?.getAttribute('data-total') ?? bellCount);
    drawBell();
    addTableTools(view);
  } catch (e) {
    view.replaceChildren(h('p', { className: 'card msg bad', textContent: e instanceof Error ? e.message : String(e) }));
  }
}

nav.refresh = async () => {
  const y = scrollY;
  await render();
  updateBell();
  scrollTo(0, y);
};

// Local development only: the signed-in client, for poking at data from the console.
if (import.meta.env.DEV) Object.assign(window, { crmDb: db });

setLang(getLang());
signOutBtn.onclick = () => db?.auth.signOut();
addEventListener('hashchange', render);
if (db) {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') recovering = true;
    // Supabase repeats SIGNED_IN whenever the tab regains focus; redrawing then
    // would wipe a half-filled form. Only a change of person redraws.
    const who = session?.user.id ?? null;
    if (who === signedIn && event !== 'PASSWORD_RECOVERY') return;
    signedIn = who;
    // Outside the callback: Supabase holds a lock while it runs.
    setTimeout(async () => {
      state.me = session ? ((await db!.from('profiles').select('id, email, full_name, lang, roles, active').eq('id', session.user.id).single()).data as Profile | null) : null;
      if (state.me && !storedLang() && LANGS.includes(state.me.lang as Lang)) setLang(state.me.lang as Lang);
      render();
      updateBell();
    });
  });
} else render();
