import { authApi, loginForRole } from './auth-api.js';

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


function bindSellerRegistration() {
  const formElement = document.getElementById('seller-register-form');
  if (!formElement) return;

  const message = document.getElementById('seller-register-message');
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';

    const creatorName = formElement.elements['creator-name'].value.trim();
    const email = formElement.elements.email.value.trim();
    const password = formElement.elements.password.value;
    const passwordConfirm = formElement.elements['password-confirm'].value;

    if (password !== passwordConfirm) {
      message.textContent = 'パスワードが一致しません。';
      return;
    }

    const submit = formElement.querySelector('button[type="submit"]');
    submit.disabled = true;

    try {
      await authApi.register(email, password);
      await authApi.sellerApplication(creatorName, creatorName, 'JP');
      message.textContent = '販売者登録申請を受け付けました。運営者の承認後、販売者としてログインできます。';
      formElement.reset();
    } catch (error) {
      message.textContent = (typeof error.body?.error === 'string' ? error.body.error : error.body?.error?.message) || error.message || '登録に失敗しました。';
    } finally {
      submit.disabled = false;
    }
  });
}

if (document.getElementById('seller-register-form')) {
  bindSellerRegistration();
}

function bindAdminLogin() {
  const formElement = document.getElementById('admin-login-form');
  if (!formElement) return;

  const message = document.getElementById('admin-login-message');
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = formElement.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = 'ログインしています…';

    try {
      await loginForRole({
        email: formElement.elements.email.value,
        password: formElement.elements.password.value,
        role: 'admin',
        redirectTo: '/pages/admin.html',
      });
    } catch (error) {
      message.textContent = error.code === 'ROLE_NOT_ALLOWED'
        ? '運営者アカウントではありません。'
        : (error.body?.error?.message || 'ログインできませんでした。');
      submit.disabled = false;
    }
  });
}

function bindAdminSetup() {
  const formElement = document.getElementById('admin-setup-form');
  if (!formElement) return;

  const message = document.getElementById('admin-setup-message');
  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = formElement.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = '運営者アカウントを作成しています…';

    const data = new FormData(formElement);
    try {
      const result = await authApi.adminSetup(
        data.get('email'),
        data.get('password'),
        data.get('password-confirm'),
        data.get('setup-token'),
      );
      message.textContent = `運営者アカウントを作成しました。\n${result.user.email}`;
      window.location.assign('/pages/admin.html');
    } catch (error) {
      message.textContent = error.body?.error?.message || '運営者アカウントを作成できませんでした。';
      submit.disabled = false;
    }
  });
}

if (document.getElementById('admin-login-form')) {
  bindAdminLogin();
}

if (document.getElementById('admin-setup-form')) {
  bindAdminSetup();
}