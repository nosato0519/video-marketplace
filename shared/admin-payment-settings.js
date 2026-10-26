(function () {
  const form = document.getElementById('payment-providers-form');
  if (!form) return;

  const status = document.getElementById('payment-providers-status');
  const saveButton = document.getElementById('save-payment-providers');
  const checks = [...form.querySelectorAll('input[name="enabledProviders"]')];
  const providerStatus = {
    stripe: document.getElementById('stripe-provider-status'),
    paypal: document.getElementById('paypal-provider-status'),
  };

  function selectedProviders() {
    return checks.filter((input) => input.checked).map((input) => input.value);
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.dataset.state = isError ? 'error' : 'ok';
  }

  function updateProviderStatus(providers) {
    for (const provider of providers) {
      const target = providerStatus[provider.id];
      if (!target) continue;
      target.textContent = provider.configured
        ? '認証情報：設定済み'
        : '認証情報：未設定（サーバー環境変数で設定してください）';
      target.dataset.configured = provider.configured ? 'true' : 'false';
      const checkbox = checks.find((input) => input.value === provider.id);
      if (checkbox) {
        checkbox.checked = Boolean(provider.enabled);
        checkbox.disabled = !provider.configured && !provider.enabled;
      }
    }
  }

  async function loadSettings() {
    saveButton.disabled = true;
    try {
      const response = await fetch('/api/admin/payment-providers', { credentials: 'same-origin' });
      const body = await response.json();
      if (!response.ok || !Array.isArray(body.providers)) {
        throw new Error(body.error || '決済設定を取得できませんでした。運営者としてログインしてください。');
      }
      updateProviderStatus(body.providers);
      setStatus('現在の決済設定を読み込みました。');
    } catch (error) {
      setStatus(error.message || '決済設定を読み込めませんでした。', true);
      checks.forEach((input) => { input.disabled = true; });
    } finally {
      saveButton.disabled = false;
    }
  }

  checks.forEach((input) => {
    input.addEventListener('change', () => {
      if (input.dataset.configured !== 'true' && input.checked) {
        input.checked = false;
      }
      input.disabled = input.dataset.configured !== 'true' && !input.checked;
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const enabledProviders = selectedProviders();
    if (enabledProviders.length === 0) {
      setStatus('StripeまたはPayPalを1つ以上選択してください。', true);
      return;
    }

    saveButton.disabled = true;
    checks.forEach((input) => { input.disabled = true; });
    setStatus('設定を保存しています…');
    try {
      const response = await fetch('/api/admin/payment-providers/settings', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledProviders }),
      });
      const body = await response.json();
      if (!response.ok) {
        const missing = Array.isArray(body.providers) ? body.providers.join(', ') : '';
        throw new Error(body.message || (missing ? '認証情報が未設定です: ' + missing : body.error) || '設定を保存できませんでした。');
      }
      setStatus('決済設定を保存しました。購入画面に反映されます。');
      await loadSettings();
    } catch (error) {
      setStatus(error.message || '設定を保存できませんでした。', true);
    } finally {
      checks.forEach((input) => {
        const provider = input.value;
        const target = providerStatus[provider];
        input.disabled = target?.dataset.configured !== 'true' && !input.checked;
      });
      saveButton.disabled = false;
    }
  });

  loadSettings();
})();