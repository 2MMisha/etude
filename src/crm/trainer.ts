// /trainers/me/ — a trainer's own page inside the trainers' app. After signing
// in they see only what is theirs: lessons to confirm, lessons coming up (ask
// to move or cancel), a form to ask for a new lesson, and their earnings.
// Every call goes through the trainer_* functions in the database, which work
// out who is asking; this page cannot reach anyone else's data.
import { LANGS, LOCALE, getLang, setLang, t, type Key } from './i18n';
import { db, h, get, ok, nav, select, field, sureButton, flash, money, ltr, today, type Row } from './ui';
import { signInView, newPasswordView } from './auth';

const CHARGED = ['done', 'no_show', 'late_cancel'] as const;
const view = document.getElementById('view')!;
const signOutBtn = document.getElementById('signOut') as HTMLButtonElement;
let signedIn: string | null | undefined; // undefined = not heard from Supabase yet
let recovering = false;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const hhmm = (time: string | null) => (time ?? '').slice(0, 5);
const dayText = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
const when = (l: Row) => ltr(`${dayText(l.held_on)} ${hhmm(l.start_time)}`);
const card = (key: Key) => h('p', { className: 'card sign', textContent: t(key) });
const done = (p: PromiseLike<boolean>) => p.then((okay) => { if (okay) nav.refresh(); });

async function home() {
  const summary = await get<Row | null>(db!.rpc('trainer_summary'));
  if (!summary) return card('notLinked');
  const [lessons, students, rates] = await Promise.all([
    get<Row[]>(db!.rpc('trainer_lessons', { d1: addDays(today(), -45), d2: addDays(today(), 180) })),
    get<Row[]>(db!.rpc('trainer_students')),
    get<Row[]>(db!.rpc('trainer_rates_mine')),
  ]);
  document.getElementById('who')!.textContent = `ETUDE — ${summary.name}`;

  const toConfirm = lessons.filter((l) => l.status === 'planned' && l.held_on <= today());
  const coming = lessons.filter((l) => l.status === 'requested' || (l.status === 'planned' && l.held_on > today()));
  const recent = lessons.filter((l) => (CHARGED as readonly string[]).includes(l.status)).reverse().slice(0, 30);
  const line = (l: Row) => h('span', { className: 'grow' }, when(l), ` · ${l.students ?? ''} · ${l.minutes}′`, l.hall && ` · ${l.hall}`, l.note && h('small', {}, l.note));

  // What is waiting for a word from me: say what happened.
  const confirmCard = toConfirm.length > 0 && h('section', { className: 'card' },
    h('h2', { textContent: `${t('toConfirm')} (${toConfirm.length})` }),
    ...toConfirm.map((l) => h('div', { className: 'row' }, line(l),
      ...CHARGED.map((st) => h('button', { type: 'button', className: st === 'done' ? 'primary' : '', textContent: t(st), onclick: () => done(ok(db!.rpc('trainer_confirm', { lid: l.id, st }))) }))
    ))
  );

  // What is coming: a lesson still waiting for approval can be withdrawn; a planned one can be asked to move or to cancel.
  const comingRow = (l: Row) => {
    const row = h('div', { className: 'row' });
    const ask = (kind: 'move' | 'cancel') => {
      const date = h('input', { type: 'date', value: l.held_on, ariaLabel: t('date') });
      const time = h('input', { type: 'time', step: 300, value: hhmm(l.start_time), ariaLabel: t('time') });
      const note = h('input', { type: 'text', placeholder: t('comment') });
      row.replaceChildren(line(l), ...(kind === 'move' ? [date, time] : []), note, h('button', { type: 'button', className: 'primary', textContent: t('send'), onclick: () =>
        done(ok(db!.rpc('trainer_request_change', { lid: l.id, k: kind, d: kind === 'move' ? date.value : null, t: kind === 'move' ? time.value : null, n: note.value.trim() }))) }));
    };
    row.append(
      line(l),
      l.status === 'requested' ? h('small', {}, t('waitingApproval')) : '',
      l.request ? h('small', {}, l.request.kind === 'move' ? `${t('moveAsked')} ${dayText(l.request.new_date)} ${hhmm(l.request.new_time)}` : t('cancelAsked')) : '',
      ...(l.status === 'requested'
        ? [sureButton(t('withdraw'), () => done(ok(db!.rpc('trainer_withdraw', { lid: l.id }))))]
        : [h('button', { type: 'button', textContent: t('askMove'), onclick: () => ask('move') }), h('button', { type: 'button', textContent: t('askCancel'), onclick: () => ask('cancel') })])
    );
    return row;
  };
  const comingCard = h('section', { className: 'card' },
    h('h2', { textContent: `${t('comingUp')} (${coming.length})` }),
    ...(coming.length ? coming.map(comingRow) : [h('p', { className: 'muted', textContent: t('emptyList') })])
  );

  // Ask for a new lesson: it goes to the admin, at my own rate. The first student's partner is offered as the second.
  const options = students.map((s): [string, string] => [s.id, s.full_name]);
  const date = h('input', { type: 'date', value: today(), min: today(), required: true });
  const time = h('input', { type: 'time', step: 300, required: true });
  const minutes = select(rates.map((r): [string, string] => [String(r.minutes), `${r.minutes}′`]), String(rates[0]?.minutes ?? ''), () => {}, { required: true });
  const hall = select((summary.halls as string[]).map((x): [string, string] => [x, x]), summary.halls[0] ?? '', () => {});
  const others = [1, 2, 3].map((n) => select([['', '—'], ...options], '', () => {}, { ariaLabel: `${t('student')} ${n + 1}` }));
  const first = select([['', '—'], ...options], '', (v) => (others[0].value = students.find((s) => s.id === v)?.partner_id ?? ''), { required: true });
  const note = h('input', { type: 'text' });
  const form = h('form', { className: 'card' },
    h('h2', { textContent: t('askLesson') }),
    h('div', { className: 'grid' },
      field(t('date'), date), field(t('time'), time), field(t('minutes'), minutes), field(t('hall'), hall),
      field(t('student'), first), field(t('comment'), note, 'wide'),
      field(t('secondStudent'), h('div', { className: 'row' }, ...others), 'full')
    ),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('send') }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const group = [first.value, ...others.map((o) => o.value)].filter((id, i, all) => id && all.indexOf(id) === i);
    await get(db!.rpc('trainer_request_lesson', {
      l: { held_on: date.value, start_time: time.value, minutes: Number(minutes.value), hall: hall.value, note: note.value.trim() },
      student_ids: group,
    }));
    flash(t('saved'));
    nav.refresh();
  };

  const earnings = h('section', { className: 'card' },
    h('h2', { textContent: t('myEarnings') }),
    h('p', { className: 'quote' }, `${t('earned')}: `, ltr(money(summary.earned)), ` · ${t('received')}: `, ltr(money(summary.paid)), ` · ${t('toReceive')}: `, ltr(money(summary.owed))),
    recent.length > 0 && h('div', { className: 'scroll' }, h('table', {}, h('tbody', {}, ...recent.map((l) => h('tr', {},
      h('td', {}, when(l)), h('td', {}, l.students ?? ''), h('td', {}, t(l.status as Key)), h('td', {}, ltr(money(l.trainer_pay)))
    )))))
  );

  return h('div', { className: 'stack' }, confirmCard, comingCard, form, earnings);
}

async function render() {
  signOutBtn.hidden = !signedIn;
  signOutBtn.textContent = t('signOut');
  document.getElementById('toSchedule')!.textContent = t('toSchedule');
  document.getElementById('langs')!.replaceChildren(
    ...LANGS.map((l) => h('button', { type: 'button', textContent: l.toUpperCase(), ariaPressed: String(l === getLang()), onclick: () => { setLang(l); render(); } }))
  );
  if (!db) return view.replaceChildren(card('notConnected'));
  if (recovering) return view.replaceChildren(newPasswordView(() => { recovering = false; render(); }));
  if (!signedIn) return view.replaceChildren(signInView());
  try {
    view.replaceChildren(await home());
  } catch (e) {
    view.replaceChildren(h('p', { className: 'card msg bad', textContent: e instanceof Error ? e.message : String(e) }));
  }
}

nav.refresh = async () => {
  const y = scrollY;
  await render();
  scrollTo(0, y);
};

setLang(getLang());
signOutBtn.onclick = () => db?.auth.signOut();
if (db) {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') recovering = true;
    // Supabase repeats SIGNED_IN whenever the tab regains focus; only a change of person redraws.
    const who = session?.user.id ?? null;
    if (who === signedIn && event !== 'PASSWORD_RECOVERY') return;
    signedIn = who;
    setTimeout(render); // outside the callback: Supabase holds a lock while it runs
  });
} else render();
