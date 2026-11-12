// The sign-in and "set a new password" forms, shared by the CRM and the
// trainers' page. Both sit on the same site, so one sign-in serves both.
import { t } from './i18n';
import { db, h } from './ui';

const message = () => h('p', { className: 'msg', role: 'status' });

/** Email + password. "Forgot" sends a reset link that comes back to this same page. */
export function signInView() {
  const email = h('input', { type: 'email', autocomplete: 'username', required: true });
  const password = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const msg = message();
  const form = h('form', { className: 'card sign' },
    h('label', {}, t('email'), email),
    h('label', {}, t('password'), password),
    h('button', { className: 'primary', type: 'submit', textContent: t('signIn') }),
    h('button', { className: 'link', type: 'button', textContent: t('forgot'), onclick: async () => {
      msg.className = 'msg';
      if (!email.value) return void (msg.textContent = t('needEmail'));
      await db!.auth.resetPasswordForEmail(email.value, { redirectTo: `${location.origin}${location.pathname}` });
      msg.textContent = t('sent');
    } }),
    msg
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await db!.auth.signInWithPassword({ email: email.value, password: password.value });
    if (error) {
      msg.className = 'msg bad';
      msg.textContent = t('wrong');
    } // on success the page's onAuthStateChange redraws
  };
  return form;
}

/** Reached from the link in the reset email; `done` runs once the new password is saved. */
export function newPasswordView(done: () => void) {
  const password = h('input', { type: 'password', autocomplete: 'new-password', required: true, minLength: 8 });
  const msg = message();
  const form = h('form', { className: 'card sign' }, h('label', {}, t('newPassword'), password), h('button', { className: 'primary', type: 'submit', textContent: t('save') }), msg);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await db!.auth.updateUser({ password: password.value });
    if (error) {
      msg.className = 'msg bad';
      return void (msg.textContent = error.message);
    }
    done();
  };
  return form;
}
