function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.error || 'Request failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

const verificationLabels = {
  not_started: '未申請',
  submitted: '申請中',
  under_review: '審査中',
  request_changes: '差し戻し',
  verified: '確認済み',
  rejected: '却下',
};

async function loadSellerProfile() {
  const response = await request('/api/seller/profile');
  const profile = response.profile;
  if (!profile) return;

  const publicFields = document.querySelectorAll('.seller-profile-form .seller-profile-field strong');
  if (publicFields[0]) publicFields[0].textContent = profile.display_name || '';
  if (publicFields[1]) publicFields[1].textContent = profile.country_code || '';

  const bioElement = document.querySelector('.seller-profile-field-large p');
  if (bioElement) bioElement.textContent = profile.bio || '';

  const privateFields = document.querySelectorAll('.seller-private-form .seller-profile-field strong');
  if (privateFields[0]) privateFields[0].textContent = profile.legal_name || '';
  if (privateFields[1]) privateFields[1].textContent = profile.address || '';
  if (privateFields[2]) privateFields[2].textContent = profile.postal_code || '';
  if (privateFields[3]) privateFields[3].textContent = profile.phone || '';

  const verificationStatus = document.querySelector('#verification-status');
  const verificationAction = document.querySelector('#verification-submit');
  const verificationNote = document.querySelector('#verification-note');
  const verificationMethod = profile.verification_method || 'document';
  const emailSection = document.querySelector('#verification-email-section');
  const emailAddress = document.querySelector('#verification-email-address');
  const emailStatus = document.querySelector('#verification-email-status');
  const documentSection = document.querySelector('#verification-document-section');

  if (emailSection) emailSection.hidden = !['email', 'email_and_document'].includes(verificationMethod);
  if (documentSection) documentSection.hidden = !['document', 'email_and_document'].includes(verificationMethod);
  if (emailAddress) emailAddress.textContent = profile.email ? `確認先：${profile.email}` : '登録メールアドレスを確認してください。';
  if (emailStatus) emailStatus.textContent = profile.email_verified_at ? 'メールアドレス確認済みです。' : '未確認です。';
  const payoutNote = document.querySelector('#verification-payout-note');
  if (payoutNote) {
    payoutNote.textContent = verificationMethod === 'none'
      ? '本人確認は不要です。販売者マイページから出金申請を行えます。'
      : verificationMethod === 'email'
        ? 'メールアドレス確認が完了すると、販売者マイページから出金申請を行えます。'
        : verificationMethod === 'email_and_document'
          ? 'メールアドレス確認と本人確認書類の承認が完了すると、販売者マイページから出金申請を行えます。'
          : '本人確認書類の運営者承認が完了すると、販売者マイページから出金申請を行えます。';

  if (verificationStatus) {
    verificationStatus.textContent = verificationLabels[profile.verification_status] || '未申請';
  }
  if (verificationNote) {
    verificationNote.textContent = profile.verification_note || '販売者登録後、本人確認の申請を行ってください。';
  }
  if (verificationAction) {
    const canSubmit = ['document', 'email_and_document'].includes(verificationMethod)
      && ['not_started', 'request_changes', 'rejected'].includes(profile.verification_status);
    verificationAction.hidden = !canSubmit;
    verificationAction.disabled = true;
    verificationAction.textContent = profile.verification_status === 'rejected'
      ? '本人確認を再申請する'
      : '本人確認を申請する';
  }
}

async function loadVerificationDocument() {
  const status = document.querySelector('#verification-document-status');
  const input = document.querySelector('#verification-document');
  const uploadButton = document.querySelector('#verification-document-upload');
  const verificationButton = document.querySelector('#verification-submit');
  if (!status || !input || !uploadButton) return;

  try {
    const response = await request('/api/seller/profile/verification-document');
    const verificationDocument = response.document;
    status.textContent = verificationDocument
      ? `提出済み：${verificationDocument.original_filename}`
      : '本人確認書類は未提出です。';
    const locked = verificationDocument && ['submitted', 'under_review', 'verified'].includes(
      verificationDocument.seller_verification_status
    );
    input.disabled = locked;
    uploadButton.disabled = locked;

    if (verificationButton) {
      const method = document.querySelector('#verification-email-section')?.hidden
        ? 'document'
        : (document.querySelector('#verification-document-section')?.hidden ? 'email' : 'email_and_document');
      const canSubmit = ['not_started', 'request_changes', 'rejected'].includes(
        verificationDocument?.seller_verification_status
      );
      verificationButton.disabled = method === 'email' ? true : !verificationDocument || !canSubmit;
    }
  } catch (error) {
    status.textContent = '本人確認書類の状態を取得できませんでした。';
    if (verificationButton) verificationButton.disabled = true;
  }
}

async function sendVerificationEmail() {
  const button = document.querySelector('#verification-email-send');
  const status = document.querySelector('#verification-email-status');
  if (!button || !status) return;

  button.disabled = true;
  status.textContent = '送信中…';
  try {
    const response = await request('/api/seller/profile/verification-email/send', { method: 'POST', body: '{}' });
    if (response.verified) {
      status.textContent = 'メールアドレス確認済みです。';
      await loadSellerProfile();
      return;
    }
    status.textContent = '確認メールを送信しました。メール内のリンクを開いてください。';
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    status.textContent = '確認メールを送信できませんでした。';
    alert(error.body?.error?.message || error.body?.error || '確認メールの送信に失敗しました。');
  } finally {
    button.disabled = false;
  }
}

async function confirmEmailFromLink() {
  const token = new URLSearchParams(window.location.search).get('email_verification_token');
  if (!token) return;

  const status = document.querySelector('#verification-email-status');
  if (status) status.textContent = 'メールアドレスを確認中…';
  try {
    const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error('email_verification_failed'), { body });
    if (status) status.textContent = 'メールアドレス確認済みです。';
    window.history.replaceState({}, document.title, window.location.pathname);
    await loadSellerProfile();
    await loadPayouts();
  } catch (error) {
    if (status) status.textContent = error.body?.error?.message || '確認リンクが無効か期限切れです。';
  }
}

async function uploadVerificationDocument() {
  const input = document.querySelector('#verification-document');
  const button = document.querySelector('#verification-document-upload');
  const status = document.querySelector('#verification-document-status');
  const file = input?.files?.[0];
  if (!file || !button || !status) return;

  button.disabled = true;
  status.textContent = 'アップロード中…';
  try {
    const response = await fetch('/api/seller/profile/verification-document', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': file.type,
        'X-Original-Filename': file.name,
      },
      body: file,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(body?.error?.message || body?.error || 'Upload failed');
      error.status = response.status;
      error.body = body;
      throw error;
    }
    status.textContent = `提出済み：${body.document.original_filename}`;
    input.value = '';
    const verificationButton = document.querySelector('#verification-submit');
    if (verificationButton) verificationButton.disabled = false;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    status.textContent = '本人確認書類をアップロードできませんでした。';
    alert(error.body?.error?.message || error.body?.error || '本人確認書類のアップロードに失敗しました。');
  } finally {
    button.disabled = false;
  }
}

async function submitSellerVerification() {
  const button = document.querySelector('#verification-submit');
  if (!button) return;

  button.disabled = true;
  try {
    await request('/api/seller/profile/submit-verification', { method: 'POST', body: '{}' });
    await loadSellerProfile();
    await loadVerificationDocument();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    alert(error.body?.error?.message || error.body?.error || '本人確認の申請に失敗しました。');
    button.disabled = false;
  }
}

function formatYen(amount) {
  return `¥${Number(amount || 0).toLocaleString('ja-JP')}`;
}

function statusLabel(status) {
  return {
    requested: '申請済み',
    reviewing: '審査中',
    approved: '承認済み',
    processing: '処理中',
    paid: '支払済み',
    failed: '失敗',
    cancelled: 'キャンセル',
  }[status] || status || '未設定';
}

function renderPayoutHistory(payouts) {
  const historyElement = document.querySelector('#withdrawal-history');
  if (!historyElement) return;
  if (!payouts.length) {
    historyElement.innerHTML = '<small>出金履歴はありません。</small>';
    return;
  }
  historyElement.innerHTML = payouts.map((payout) => {
    const date = payout.requested_at
      ? new Date(payout.requested_at).toLocaleDateString('ja-JP')
      : '-';
    return `<span>${escapeHtml(date)}</span>
      <strong>${formatYen(payout.amount)}　${escapeHtml(statusLabel(payout.status))}</strong>
      <small>${payout.paid_at ? '振込済み' : '振込処理中'}</small>`;
  }).join('');
}

async function loadPayouts() {
  const amountElement = document.querySelector('#withdrawable-amount');
  const amountInput = document.querySelector('#withdrawal-amount');
  const submitButton = document.querySelector('#withdrawal-submit');
  const historyElement = document.querySelector('#withdrawal-history');
  if (!amountElement || !amountInput || !submitButton || !historyElement) return;

  try {
    const data = await request('/api/seller/payouts');
    amountElement.textContent = formatYen(data.summary?.withdrawable);
    renderPayoutHistory(data.payouts || []);
  } catch (error) {
    if (error.status === 401) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    if (error.status === 403 && error.body?.error?.code === 'SELLER_VERIFICATION_REQUIRED') {
      amountElement.textContent = '本人確認承認後に利用できます';
      amountInput.disabled = true;
      submitButton.disabled = true;
      historyElement.innerHTML = '<small>本人確認の承認が完了すると、売上の出金申請を利用できます。</small><br><a href="/seller/profile.html">本人確認を確認する →</a>';
      return;
    }
    historyElement.innerHTML = '<small>出金情報を取得できませんでした。</small>';
  }
}

async function submitPayout() {
  const amountInput = document.querySelector('#withdrawal-amount');
  const submitButton = document.querySelector('#withdrawal-submit');
  if (!amountInput || !submitButton) return;

  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    amountInput.focus();
    return;
  }

  submitButton.disabled = true;
  try {
    await request('/api/seller/payouts', {
      method: 'POST',
      body: JSON.stringify({ amount, currency: 'JPY' }),
    });
    amountInput.value = '';
    await loadPayouts();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    alert(error.body?.error?.message || error.body?.error || '出金申請に失敗しました。');
  } finally {
    submitButton.disabled = false;
  }
}

if (document.querySelector('#verification-submit')) {
  document.querySelector('#verification-submit').addEventListener('click', submitSellerVerification);
}

if (document.querySelector('#verification-status')) {
  confirmEmailFromLink();
  loadSellerProfile()
    .then(() => loadVerificationDocument())
    .catch((error) => {
      if (error.status === 401 || error.status === 403) {
        window.location.href = '/pages/seller-login.html';
      }
    });
}

if (document.querySelector('#verification-email-send')) {
  document.querySelector('#verification-email-send').addEventListener('click', sendVerificationEmail);
}

if (document.querySelector('#verification-document-upload')) {
  document.querySelector('#verification-document-upload').addEventListener('click', uploadVerificationDocument);
}

if (document.querySelector('#withdrawal-submit')) {
  document.querySelector('#withdrawal-submit').addEventListener('click', submitPayout);
  loadPayouts();
}

async function loadSellerProfileEdit() {
  const nameInput = document.querySelector('#creator-name');
  const bioInput = document.querySelector('#creator-bio');
  const countryInput = document.querySelector('#creator-country');
  const legalNameInput = document.querySelector('#real-name');
  const addressInput = document.querySelector('#address');
  const postalCodeInput = document.querySelector('#postal-code');
  const phoneInput = document.querySelector('#phone');
  if (!nameInput || !bioInput || !countryInput || !legalNameInput || !addressInput || !postalCodeInput || !phoneInput) return;

  const { profile } = await request('/api/seller/profile', { cache: 'no-store' });
  nameInput.value = profile?.display_name || '';
  bioInput.value = profile?.bio || '';
  legalNameInput.value = profile?.legal_name || '';
  countryInput.value = profile?.country_code || '';
  addressInput.value = profile?.address || '';
  postalCodeInput.value = profile?.postal_code || '';
  phoneInput.value = profile?.phone || '';
}

async function saveSellerProfileEdit() {
  const saveButton = document.querySelector('#profile-save');
  const nameInput = document.querySelector('#creator-name');
  const bioInput = document.querySelector('#creator-bio');
  const countryInput = document.querySelector('#creator-country');
  const legalNameInput = document.querySelector('#real-name');
  const addressInput = document.querySelector('#address');
  const postalCodeInput = document.querySelector('#postal-code');
  const phoneInput = document.querySelector('#phone');
  if (!saveButton || !nameInput || !bioInput || !countryInput || !legalNameInput || !addressInput || !postalCodeInput || !phoneInput) return;

  saveButton.disabled = true;
  try {
    await request('/api/seller/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: nameInput.value,
        legalName: legalNameInput.value,
        countryCode: countryInput.value,
        bio: bioInput.value,
        address: addressInput.value,
        postalCode: postalCodeInput.value,
        phone: phoneInput.value,
      }),
    });
    window.location.href = '/seller/profile.html';
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    alert(error.body?.error?.message || error.body?.error || 'プロフィールを保存できませんでした。');
  } finally {
    saveButton.disabled = false;
  }
}

if (document.querySelector('#profile-save')) {
  document.querySelector('#profile-save').addEventListener('click', saveSellerProfileEdit);
  loadSellerProfileEdit().catch((error) => {
    if (error.status === 401 || error.status === 403) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    alert(error.body?.error?.message || error.body?.error || 'プロフィール情報を取得できませんでした。');
  });
}