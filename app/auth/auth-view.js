import { authApi } from './auth-api.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function form(title, mode) {
  const isRegister = mode === 'register';
  return `<main class="auth-page"><section class="auth-card"><p class="eyebrow">VIDEO MARKET</p><h1>${title}</h1><form id="auth-form"><label>Email<input name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Password<input name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" minlength="12" required></label><button class="button" type="submit">${isRegister ? 'Create account' : 'Log in'}</button><p id="auth-message" class="microcopy" aria-live="polite"></p></form><p class="microcopy"><a href="#/${isRegister ? 'login' : 'register'}">${isRegister ? 'Already have an account? Log in' : 'Create an account'}</a></p></section></main>`;
}

export function renderAuth(root, mode) {
  root.innerHTML = form(mode === 'register' ? 'Create your account' : 'Log in', mode);
  const formElement = root.querySelector('#auth-form');
  const message = root.querySelector('#auth-message');
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = formElement.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Please wait…';
    const data = new FormData(formElement);
    try {
      const result = mode === 'register'
        ? await authApi.register(data.get('email'), data.get('password'))
        : await authApi.login(data.get('email'), data.get('password'));
      message.textContent = `Signed in as ${escapeHtml(result.user.email)}.`;
      location.hash = '#/browse';
    } catch (error) {
      message.textContent = error.status === 401 ? 'Email or password is incorrect.' : (error.body?.error?.message || 'Unable to complete authentication.');
      submit.disabled = false;
    }
  });
}
