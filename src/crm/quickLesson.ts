// Shared by the CRM's Schedule tab and the trainer's page:
//   hallNotice() — what else is in a hall at a given time (hall_check in the
//     database). A group class or a master class blocks a lesson there (the
//     database refuses it too); another private lesson or a rental only warns.
//   quickAdd() — one line, "18:30 Dana 45": finds the student by a first name
//     or surname in Hebrew or English, asks "alone or with the partner" when
//     the student has one, takes a guest's name when nobody matches, shows what
//     will be set, and sets it.
import { getLang, t, LOCALE, type Key } from './i18n';
import { db, h, get, flash, studentLabel, type Row } from './ui';

const KIND: Record<string, Key> = { group: 'groupClass', event: 'masterClass', lesson: 'privateLesson', rental: 'rent' };

export function hallNotice() {
  const el = h('div', { className: 'stack' });
  let asked = 0;
  /** Shows what is there; resolves true when a lesson may not go there. */
  const check = async (date: string, time: string, minutes: number, hall: string, skip?: string): Promise<boolean> => {
    const n = ++asked;
    if (!date || !time || !(minutes > 0) || !hall) return (el.replaceChildren(), false);
    const items = await get<Row[]>(db!.rpc('hall_check', { d: date, t: time, mins: minutes, h: hall, skip: skip ?? null }));
    if (n !== asked) return false; // a newer question is on its way
    const blocked = items.some((x) => x.kind === 'group' || x.kind === 'event');
    el.replaceChildren(...(items.length ? [h('p', { className: 'warn' },
      blocked ? t('hallBlocked') : t('hallAlso'),
      ...items.map((x) => h('small', {}, `${t(KIND[x.kind])}${x.title ? ` ${x.title}` : ''}${x.trainer ? ` · ${x.trainer}` : ''} · `, h('span', { dir: 'ltr' }, `${x.start}–${x.end}`))))] : []));
    return blocked;
  };
  return { el, check };
}

const words = (s: string) => s.toLocaleLowerCase().split(/[\s\-–'"()]+/).filter(Boolean);
/** Students whose first name or surname (Hebrew or English) starts with what was typed. */
export const findStudents = (students: Row[], name: string) => {
  const q = words(name);
  return q.length ? students.filter((s) => {
    const w = words(`${s.full_name ?? ''} ${s.full_name_en ?? ''}`);
    return q.every((x) => w.some((y) => y.startsWith(x)));
  }) : [];
};

/** "18:30 Dana Levi 45" → time, name, minutes; null when it isn't that shape. */
export const parseQuick = (text: string) => {
  const m = text.trim().match(/^(\d{1,2})[:.](\d{2})\s+(.+?)\s+(\d{2,3})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return { time: `${m[1].padStart(2, '0')}:${m[2]}`, name: m[3].trim(), minutes: Number(m[4]) };
};

export interface QuickLesson { start_time: string; minutes: number; student_ids: string[]; guest_name: string }

export function quickAdd(o: {
  students: Row[];
  /** The other choices on the line (date, hall, and in the CRM the trainer). */
  controls: HTMLElement[];
  where: () => { date: string; hall: string; who?: string };
  lengths: () => number[];
  create: (x: QuickLesson) => Promise<unknown>;
}) {
  const input = h('input', { type: 'text', placeholder: t('quickHint'), ariaLabel: t('quickAdd'), className: 'grow' });
  const out = h('div', { className: 'stack' });
  const notice = hallNotice();
  const btn = (text: string, onclick: () => void, primary = false) => h('button', { type: 'button', className: primary ? 'primary' : '', textContent: text, onclick });
  const close = btn('×', () => out.replaceChildren());

  const confirm = async (q: { time: string; minutes: number }, ids: string[], guest: string) => {
    const w = o.where();
    const who = [...ids.map((id) => studentLabel(o.students.find((s) => s.id === id)!)), guest].filter(Boolean).join(' + ');
    const day = new Date(`${w.date}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' });
    const set = btn(t('putOnSchedule'), async () => {
      set.disabled = true;
      try {
        await o.create({ start_time: q.time, minutes: q.minutes, student_ids: ids, guest_name: guest });
        input.value = '';
        out.replaceChildren();
      } finally {
        set.disabled = false;
      }
    }, true);
    out.replaceChildren(
      h('p', { className: 'quote' }, h('span', { dir: 'ltr' }, `${day} ${q.time}, ${q.minutes}′`), ` · ${w.hall}${w.who ? ` · ${w.who}` : ''} · ${who}`),
      notice.el,
      h('div', { className: 'row' }, set, close)
    );
    set.disabled = await notice.check(w.date, q.time, q.minutes, w.hall);
  };

  const pick = (q: { time: string; minutes: number }, s: Row) => {
    const partner = s.partner_id && o.students.find((x) => x.id === s.partner_id);
    if (!partner) return confirm(q, [s.id], '');
    out.replaceChildren(h('div', { className: 'row' },
      btn(`${t('alone')}: ${studentLabel(s)}`, () => confirm(q, [s.id], '')),
      btn(`${t('withPartner')} ${studentLabel(partner)}`, () => confirm(q, [s.id, partner.id], ''), true),
      close));
  };

  const go = () => {
    const q = parseQuick(input.value);
    if (!q) return flash(t('quickBad'), true);
    if (!o.where().date || !o.where().hall) return flash(t('quickBad'), true);
    if (!o.lengths().includes(q.minutes)) return flash(t('noRate'), true);
    const found = findStudents(o.students, q.name);
    if (found.length === 1) return pick(q, found[0]);
    if (found.length > 1) {
      return out.replaceChildren(h('p', { textContent: t('quickWho') }),
        h('div', { className: 'row' }, ...found.slice(0, 12).map((s) => btn(studentLabel(s), () => pick(q, s))), close));
    }
    const guest = h('input', { type: 'text', value: q.name, ariaLabel: t('guestName') });
    out.replaceChildren(h('p', { textContent: t('quickNone') }),
      h('div', { className: 'row' }, guest, btn('→', () => (guest.value.trim() ? confirm(q, [], guest.value.trim()) : flash(t('needName'), true)), true), close));
  };
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };

  return h('div', { className: 'stack' },
    h('h2', { textContent: t('quickAdd') }),
    h('div', { className: 'row' }, ...o.controls, input, btn('→', go, true)),
    out);
}
