const securityKey = 'vm-demo-admin-setting-security';
const securityForm = document.getElementById('settings-form');
const securityStatus = document.getElementById('save-status');
const securityReset = document.getElementById('reset-settings');
const verificationForm = document.getElementById('seller-verification-form');
const verificationMethod = document.getElementById('seller-verification-method');
const verificationStatus = document.getElementById('seller-verification-status');

function saveSecurityDemo() {
  if (!securityForm) return;
  const data = {};
  [...securityForm.elements].filter((element) => element.name).forEach((element) => {
    data[element.name] = element.type === 'checkbox' ? element.checked : element.value;
  });
  localStorage.setItem(securityKey, JSON.stringify(data));
  securityStatus.textContent = '設定をこのブラウザに保存しました（デモ）';
}

function loadSecurityDemo() {
  if (!securityForm) return;
  const defaults = [...securityForm.elements].filter((element) => element.name).map((element) => ({
    name: element.name,
    value: element.value,
    checked: element.checked,
  }));
  try {
    const saved = JSON.parse(localStorage.getItem(securityKey) || 'null');
    if (saved) {
      [...securityForm.elements].filter((element) => element.name).forEach((element) => {
        if (!(element.name in saved)) return;
        if (element.type === 'checkbox') element.checked = Boolean(saved[element.name]);
        else element.value = saved[element.name];
      });
      securityStatus.textContent = 'このブラウザに保存済みの設定';
    }
  } catch {}
  securityForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try { saveSecurityDemo(); } catch { securityStatus.textContent = '保存できませんでした'; }
  });
  securityReset?.addEventListener('click', () => {
    defaults.forEach((item) => {
      const element = [...securityForm.elements].find((candidate) => candidate.name === item.name);
      if (!element) return;
      if (element.type === 'checkbox') element.checked = item.checked;
      else element.value = item.value;
    });
    try { localStorage.removeItem(securityKey); } catch {}
    securityStatus.textContent = '初期値に戻しました（デモ）';
  });
}

async function loadVerificationSetting() {
  if (!verificationForm) return;
  try {
    const response = await fetch('/api/admin/settings/seller-verification', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('settings_load_failed');
    const data = await response.json();
    verificationMethod.value = data.method || 'document';
    verificationStatus.textContent = '現在の設定を読み込みました';
  } catch {
    verificationStatus.textContent = '設定を読み込めませんでした';
  }
}

verificationForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  verificationStatus.textContent = '保存中...';
  try {
    const response = await fetch('/api/admin/settings/seller-verification', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: verificationMethod.value }),
    });
    if (!response.ok) throw new Error('settings_save_failed');
    const data = await response.json();
    verificationMethod.value = data.method || verificationMethod.value;
    verificationStatus.textContent = '設定を保存しました';
  } catch {
    verificationStatus.textContent = '設定を保存できませんでした';
  }
});

loadSecurityDemo();
loadVerificationSetting();