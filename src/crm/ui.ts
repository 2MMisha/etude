// The CRM's whole "framework": build DOM, show a status line, small controls.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../lib/crmConfig';
import { t } from './i18n';

export type Row = Record<string, any>;
export interface Profile { id: string; email: string; full_name: string; lang: 'he' | 'ru' | 'en'; roles: string[]; active: boolean }

/** Null until src/lib/crmConfig.ts is filled in. Views only run after sign-in, so they use `db!`. */
export const db = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
export const state: { me: Profile | null } = { me: null };

type Child = Node | string | number | false | null | undefined;
/** createElement with props and children — text always goes in as text, never as HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = Object.assign(document.createElement(tag), props);
  for (const k of kids) if (k != null && k !== false) el.append(typeof k === 'number' ? String(k) : k);
  return el;
}

let timer = 0;
/** The status line at the bottom: green for a moment, red for longer. */
export function flash(text: string, bad = false) {
  const el = document.getElementById('status')!;
  el.textContent = text;
  el.className = bad ? 'status bad' : 'status';
  el.hidden = false;
  clearTimeout(timer);
  timer = window.setTimeout(() => (el.hidden = true), bad ? 8000 : 1800);
}

type Result<T> = PromiseLike<{ data: T; error: { message: string; code?: string } | null }>;
/** The database refusing a delete because other records point at the row. */
const FOREIGN_KEY = '23503';
/** …or an insert because the same thing is already there (a second charge for one month). */
const DUPLICATE = '23505';
/** Read: the rows, or the error on screen (and thrown, so the view stops). */
export async function get<T>(call: Result<unknown>): Promise<T> {
  const { data, error } = await call;
  if (error) {
    flash(error.message, true);
    throw new Error(error.message);
  }
  return data as T;
}
/** Write: true and "Saved", or false and the database's refusal on screen. */
export async function ok(call: Result<unknown>): Promise<boolean> {
  const { error } = await call;
  flash(error ? (error.code === FOREIGN_KEY ? t('inUse') : error.code === DUPLICATE ? t('duplicate') : error.message) : t('saved'), !!error);
  return !error;
}

/** Redraw the current screen (set by app.ts), keeping the scroll position. */
export const nav: { refresh: () => Promise<void> } = { refresh: async () => {} };

// Controls. Each calls back with the new value when the user leaves the field.
export function input(value: unknown, onchange: (v: string, el: HTMLInputElement) => void, props: Record<string, unknown> = {}) {
  const el = h('input', { type: 'text', value: value ?? '', ...props });
  el.onchange = () => onchange(el.value.trim(), el);
  return el;
}
export const number = (value: unknown, onchange: (v: number | null, el: HTMLInputElement) => void, props: Record<string, unknown> = {}) =>
  input(value == null ? '' : Number(value), (v, el) => onchange(v === '' || !isFinite(Number(v)) || Number(v) < 0 ? null : Number(v), el), { type: 'number', min: 0, step: 'any', inputMode: 'decimal', className: 'num', ...props });
export function checkbox(checked: boolean, onchange: (v: boolean, el: HTMLInputElement) => void, props: Record<string, unknown> = {}) {
  const el = h('input', { type: 'checkbox', checked, ...props });
  el.onchange = () => onchange(el.checked, el);
  return el;
}
export function select(options: [string, string][], value: string, onchange: (v: string, el: HTMLSelectElement) => void, props: Record<string, unknown> = {}) {
  const el = h('select', props, ...options.map(([v, label]) => h('option', { value: v, textContent: label, selected: v === value })));
  el.onchange = () => onchange(el.value, el);
  return el;
}
export const field = (label: string, control: Node, className = '') => h('label', { className: `field ${className}` }, h('span', {}, label), control);
export const tick = (label: string, control: Node) => h('label', { className: 'tick' }, control, label);

/** A button that asks "Sure?" on the first click and acts on the second. */
export function sureButton(label: string, action: () => void, props: Record<string, unknown> = {}) {
  const b = h('button', { type: 'button', textContent: label, ...props });
  b.onclick = () => {
    if (b.dataset.armed) return action();
    b.dataset.armed = '1';
    b.textContent = t('sure');
    b.classList.add('danger');
    setTimeout(() => { delete b.dataset.armed; b.textContent = label; b.classList.remove('danger'); }, 4000);
  };
  return b;
}

/** Today in Israel, as YYYY-MM-DD. */
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
/**
 * Once a month, the first time the Month tab or a client page opens: put the
 * month's fee on every active student who has a price. Only once, so a line
 * deleted on purpose stays deleted; someone who joins later is added from
 * their own page, or with the button on the Month tab.
 */
export async function fillThisMonth() {
  const ym = today().slice(0, 7);
  const { data } = await db!.from('settings').select('value').eq('id', 'filled_month').maybeSingle();
  if (data?.value === ym) return;
  const { error } = await db!.rpc('create_month_charges', { m: `${ym}-01` });
  if (error) return flash(error.message, true);
  await db!.from('settings').upsert({ id: 'filled_month', value: ym });
}
export const money = (n: unknown) => (n == null ? '—' : `${Number(n)} ₪`);
/** A formula or amount that must read left to right inside Hebrew text. */
export const ltr = (text: string) => h('bdi', { dir: 'ltr', textContent: text });
/** Sum of a charge's or quote's discount percentages. */
export const pctOf = (discounts: Row | null | undefined) => Object.values(discounts ?? {}).reduce((a: number, b) => a + Number(b), 0);
