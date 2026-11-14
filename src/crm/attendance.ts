// Attendance for one group class on one date: the group's students with a tick
// each, and a button that says the class took place (which is also what earns
// its trainer the class pay). Used by the CRM's schedule (any class) and by the
// trainers' page (their own classes, through the trainer_* functions).
import { t } from './i18n';
import { db, h, get, ok, nav, sureButton, type Row } from './ui';

/** Attendance marking is switched off for now (owner, 2026-11-14); true brings it back everywhere. */
export const ATTENDANCE = false;

export function attendanceBlock(slotId: string, onDate: string, asTrainer: boolean) {
  if (!ATTENDANCE) return null;
  const box = h('div', { className: 'stack' }, h('h3', { textContent: t('attendance') }));
  const refresh = (p: PromiseLike<boolean>) => p.then((okay) => { if (okay) nav.refresh(); });
  get<Row[]>(db!.rpc(asTrainer ? 'trainer_class_roster' : 'class_roster', { sid: slotId, d: onDate })).then((rows) => {
    const marked = rows.some((r) => r.marked);
    // Not marked yet: everyone starts ticked, and whoever was away is unticked.
    const ticks = rows.map((r) => ({ id: r.student_id as string, name: r.full_name as string, box: h('input', { type: 'checkbox', checked: marked ? r.present : true }) }));
    box.append(
      rows.length
        ? h('div', { className: 'row' }, ...ticks.map((x) => h('label', { className: 'tick' }, x.box, x.name)))
        : h('p', { className: 'muted', textContent: t('noStudentsInGroup') }),
      h('div', { className: 'row' },
        h('button', { type: 'button', className: 'primary', textContent: t(marked ? 'saveAttendance' : 'classTookPlace'), onclick: () =>
          refresh(ok(db!.rpc(asTrainer ? 'trainer_mark_class' : 'mark_class', { sid: slotId, d: onDate, present_ids: ticks.filter((x) => x.box.checked).map((x) => x.id) }))) }),
        marked && h('small', {}, `✓ ${t('done')}`),
        // Only the admin can say it did not take place after all.
        marked && !asTrainer && sureButton(t('undoClass'), () => refresh(ok(db!.from('class_sessions').delete().eq('slot_id', slotId).eq('held_on', onDate))))
      )
    );
  }).catch(() => {});
  return box;
}
