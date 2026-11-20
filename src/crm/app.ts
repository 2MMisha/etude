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
import { dashboardView } from './views/dashboard';
import { logView } from './views/log';

const ROUTES: Record<string, (arg?: string, sub?: string) => Promise<HTMLElement>> = {
  home: homeView,
  dashboard: dashboardView,
  log: logView,
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
const TABS: Key[] = ['dashboard', 'clients', 'month', 'lessons', 'debts', 'trainersTab', 'reports', 'settings', 'accounts', 'log'];

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

// The bell in the top bar: how many things wait (the "Important" list), checked on
// sign-in, after every change and every 5 minutes; a tap opens the list in a small
// window under it, which closes on a choice, a tap outside or Escape.
let bellCount = 0;
const bellPanel = document.getElementById('bellPanel')!;
const bellButton = document.getElementById('bell') as HTMLButtonElement;
function closeBell() {
  bellPanel.hidden = true;
  bellButton.ariaExpanded = 'false';
}
bellButton.onclick = async (e) => {
  e.stopPropagation();
  if (!bellPanel.hidden) return closeBell();
  bellPanel.hidden = false;
  bellButton.ariaExpanded = 'true';
  bellPanel.replaceChildren(h('p', { className: 'muted', textContent: '…' }));
  try {
    const list = await homeView();
    bellCount = Number(list.dataset.total ?? 0);
    bellPanel.replaceChildren(list);
    drawBell();
  } catch {
    closeBell();
  }
};
bellPanel.onclick = (e) => {
  if ((e.target as HTMLElement).closest('a[href^="#/"]')) closeBell(); // a line was chosen: go there
  e.stopPropagation();
};
document.addEventListener('click', () => { if (!bellPanel.hidden) closeBell(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBell(); });
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
  bell.replaceChildren(h('span', { ariaHidden: 'true', textContent: '🔔' }), ...(bellCount > 0 ? [h('b', { textContent: bellCount > 99 ? '99+' : String(bellCount) })] : []));
}
setInterval(updateBell, 5 * 60 * 1000);

// The CRM as an app: it can be installed on a phone or computer (it still works in
// any browser). Chrome / Edge / Android offer it with the Install button; on iPhone,
// Safari's Share > Add to Home Screen.
let installEvent: any = null;
const installBtn = document.getElementById('install') as HTMLButtonElement;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  installBtn.textContent = `⬇ ${t('installApp')}`;
  installBtn.hidden = false;
});
installBtn.onclick = async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installBtn.hidden = true;
};
addEventListener('appinstalled', () => (installBtn.hidden = true));
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/crm/sw.js', { scope: '/crm/' }).catch(() => {});

// On a computer a client opens in a window over the list it was chosen from;
// closing it (×, Esc, a click outside, or Back) returns to that list as it was.
// On a phone the client is its own screen, as before.
const UNDER = new Set(['dashboard', 'clients', 'month', 'lessons', 'debts', 'trainersTab', 'reports', 'log', 'home', 'accounts', 'settings']);
const roomy = () => matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches;
const status = document.getElementById('status')!;
const popBody = h('div', {});
const pop = h('dialog', { className: 'popup' },
  h('button', { type: 'button', className: 'popup-close', textContent: '×', ariaLabel: t('close'), onclick: () => pop.close() }), popBody);
view.after(pop);
let closedByNav = false;
pop.addEventListener('close', () => {
  view.after(status); // messages show over the page again
  if (!closedByNav) history.back();
  closedByNav = false;
});
pop.addEventListener('click', (e) => {
  if (e.target === pop) return pop.close(); // the dimmed area outside
  // Moving inside the window (the client's tabs, another client) takes no extra Back step, so closing returns to the list.
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#/client/"]');
  if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    location.replace(a.getAttribute('href')!);
  }
});
let drawn = ''; // the route drawn on the page (under the window, when one is open)
let drawnHash = '';
const scrolls = new Map<string, number>(); // where each screen was scrolled to, for coming back

async function render() {
  const [name = '', arg, sub] = location.hash.replace(/^#\/?/, '').split('/');
  const route = name in ROUTES ? name : 'dashboard';
  if (route === 'client' && state.me && (pop.open || (UNDER.has(drawn) && roomy()))) {
    const y = pop.scrollTop;
    try {
      popBody.replaceChildren(await ROUTES.client(arg, sub));
      addTableTools(popBody);
    } catch (e) {
      popBody.replaceChildren(h('p', { className: 'card msg bad', textContent: e instanceof Error ? e.message : String(e) }));
    }
    if (!pop.open) {
      pop.showModal();
      pop.append(status);
      pop.scrollTop = 0;
    } else pop.scrollTop = y;
    return;
  }
  if (pop.open) {
    closedByNav = true;
    pop.close();
  }
  if (drawnHash) scrolls.set(drawnHash, scrollY);
  const staff = drawChrome(route);
  if (!db) return view.replaceChildren(card('notConnected'));
  if (recovering) return view.replaceChildren(newPasswordView(() => { recovering = false; render(); }));
  if (!state.me) return view.replaceChildren(signInView());
  if (!staff) return view.replaceChildren(card('noAccess'));
  try {
    view.replaceChildren(await ROUTES[route](arg, sub));
    drawn = route;
    drawnHash = location.hash;
    drawBell();
    addTableTools(view);
    scrollTo(0, scrolls.get(location.hash) ?? 0);
  } catch (e) {
    view.replaceChildren(h('p', { className: 'card msg bad', textContent: e instanceof Error ? e.message : String(e) }));
  }
}

nav.refresh = async () => {
  const y = scrollY;
  await render();
  updateBell();
  if (!pop.open) scrollTo(0, y);
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
