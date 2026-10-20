import { authApi } from "/app/auth/auth-api.js";

const form = document.querySelector("#buyer-profile-form");
const message = document.querySelector("#profile-message");
let currentUser;

try {
  const result = await authApi.me();
  currentUser = result.user;
  if (!["buyer", "seller"].includes(currentUser?.role)) throw new Error("ROLE_NOT_ALLOWED");
  form.elements.name.value = currentUser.display_name || "";
  form.elements.email.value = currentUser.email || "";
} catch {
  window.location.assign("/pages/buyer-login.html");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const currentPassword = form.elements["current-password"].value;
  const newPassword = form.elements["new-password"].value;
  const passwordConfirm = form.elements["new-password-confirm"].value;
  const submit = form.querySelector('button[type="submit"]');

  if (!displayName) {
    message.textContent = "お名前を入力してください。";
    return;
  }
  if (newPassword || passwordConfirm) {
    if (newPassword !== passwordConfirm) {
      message.textContent = "新しいパスワードが一致しません。";
      form.elements["new-password-confirm"].focus();
      return;
    }
    if (newPassword.length < 12) {
      message.textContent = "新しいパスワードは12文字以上で入力してください。";
      return;
    }
  }
  if ((email !== currentUser.email || newPassword) && !currentPassword) {
    message.textContent = "メールアドレスまたはパスワードを変更する場合は、現在のパスワードを入力してください。";
    form.elements["current-password"].focus();
    return;
  }

  submit.disabled = true;
  message.textContent = "登録情報を保存しています…";
  try {
    const result = await authApi.updateProfile({ displayName, email, currentPassword, newPassword });
    currentUser = result.user;
    form.elements.name.value = currentUser.display_name || "";
    form.elements.email.value = currentUser.email || "";
    form.elements["current-password"].value = "";
    form.elements["new-password"].value = "";
    form.elements["new-password-confirm"].value = "";
    message.textContent = "登録情報を保存しました。";
  } catch (error) {
    message.textContent = error.body?.error?.message || "登録情報を保存できませんでした。";
  } finally {
    submit.disabled = false;
  }
});

const deleteForm = document.querySelector("#delete-account-form");
const deleteMessage = document.querySelector("#delete-account-message");

deleteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!deleteForm.elements.password.value || !document.querySelector("#delete-account-confirm")?.checked) return;

  const submit = deleteForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  deleteMessage.textContent = "退会処理を実行しています…";
  try {
    await fetch("/api/auth/delete-account", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: deleteForm.elements.password.value }),
    }).then(async (response) => {
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || "退会処理に失敗しました。");
      return body;
    });
    window.location.assign("/pages/buyer-login.html?account=closed");
  } catch (error) {
    deleteMessage.textContent = error.message || "退会処理に失敗しました。";
    submit.disabled = false;
  }
});
