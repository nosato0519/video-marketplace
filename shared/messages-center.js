(function () {
  const main = document.querySelector('main');
  if (!main) return;
  const h = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  const api = async (url, options = {}) => {
    const response = await fetch('/api/messages' + url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || data.error || 'リクエストに失敗しました。');
    return data;
  };
  const section = h('section', 'buyer-section vm-message-center');
  section.style.marginTop = '24px';
  section.append(h('div', 'buyer-section-head', 'サイト内メッセージ'));
  const notice = h('p', 'vm-message-notice', 'メッセージはサイト内に保存されます。メール送信設定は不要です。');
  const layout = h('div', 'buyer-menu-grid');
  const list = h('div', 'buyer-menu-card');
  list.style.minWidth = '0';
  list.append(h('strong', '', '問い合わせ・履歴'));
  const threadList = h('div', '');
  const detail = h('div', 'buyer-menu-card');
  detail.style.minWidth = '0';
  detail.append(h('strong', '', 'メッセージ'));
  const detailBody = h('div', '');
  const replyForm = h('form', '');
  const reply = h('textarea', '');
  reply.rows = 3;
  reply.maxLength = 5000;
  reply.placeholder = '返信を入力';
  reply.style.width = '100%';
  const send = h('button', 'buyer-account', '返信する');
  send.type = 'submit';
  replyForm.append(reply, send);
  replyForm.hidden = true;
  detail.append(detailBody, replyForm);
  layout.append(list, detail);
  const create = h('form', 'buyer-menu-card');
  create.style.minWidth = '0';
  create.append(h('strong', '', '新しい問い合わせ'));
  const recipientLabel = h('label', '', '宛先');
  const recipient = h('select', '');
  recipient.style.width = '100%';
  recipientLabel.append(recipient);
  const subjectLabel = h('label', '', '件名');
  const subject = h('input', '');
  subject.required = true; subject.maxLength = 200; subject.placeholder = '件名';
  subject.style.width = '100%'; subjectLabel.append(subject);
  const bodyLabel = h('label', '', 'メッセージ');
  const body = h('textarea', '');
  body.required = true; body.maxLength = 5000; body.rows = 4; body.placeholder = '問い合わせ内容';
  body.style.width = '100%'; bodyLabel.append(body);
  const submit = h('button', 'buyer-account', '問い合わせを送信');
  submit.type = 'submit';
  create.append(recipientLabel, subjectLabel, bodyLabel, submit);
  section.append(notice, create, layout);
  const anchor = main.querySelector('.buyer-head, .topbar, .support-card');
  if (anchor) anchor.insertAdjacentElement('afterend', section);
  else main.prepend(section);
  let currentThread = null;
  let userRole = '';
  const button = (label, callback) => {
    const b = h('button', 'buyer-account', label);
    b.type = 'button'; b.style.margin = '4px 4px 4px 0';
    b.addEventListener('click', callback);
    return b;
  };
  async function loadThreads(selectId) {
    const data = await api('/threads');
    threadList.replaceChildren();
    if (!data.threads?.length) threadList.append(h('p', '', 'メッセージはまだありません。'));
    (data.threads || []).forEach((thread) => {
      const item = h('div', 'buyer-menu-card');
      item.style.marginTop = '8px';
      item.append(h('strong', '', thread.subject), h('small', '', (thread.creator_name || 'ユーザー') + ' · ' + thread.status + (thread.unread_count ? ' · 未読 ' + thread.unread_count : '')));
      if (thread.last_message) item.append(h('p', '', thread.last_message));
      item.append(button('開く', () => openThread(thread.id)));
      threadList.append(item);
    });
    if (selectId) await openThread(selectId);
  }
  async function openThread(id) {
    const data = await api('/threads/' + encodeURIComponent(id));
    currentThread = data.thread;
    detailBody.replaceChildren();
    detailBody.append(h('h3', '', data.thread.subject), h('p', '', '状態：' + data.thread.status));
    (data.messages || []).forEach((message) => {
      const bubble = h('div', 'buyer-menu-card');
      bubble.style.marginTop = '8px';
      bubble.append(h('strong', '', message.sender_name + '（' + message.sender_role + '）'), h('small', '', new Date(message.created_at).toLocaleString('ja-JP')), h('p', '', message.body));
      detailBody.append(bubble);
    });
    replyForm.hidden = false;
    if (userRole === 'admin') {
      const status = h('select', '');
      [['open','対応中'],['waiting','返信待ち'],['resolved','解決済み']].forEach(([value,label]) => {
        const opt = h('option','',label); opt.value=value; opt.selected=value===data.thread.status; status.append(opt);
      });
      status.addEventListener('change', async () => {
        await api('/threads/' + encodeURIComponent(id) + '/status', { method:'PATCH', body: JSON.stringify({status:status.value}) });
        await loadThreads(id);
      });
      detailBody.append(status);
    }
  }
  replyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentThread || !reply.value.trim()) return;
    send.disabled = true;
    try {
      await api('/threads/' + encodeURIComponent(currentThread.id) + '/messages', { method:'POST', body:JSON.stringify({message:reply.value}) });
      reply.value = '';
      await loadThreads(currentThread.id);
    } catch (error) { notice.textContent = error.message; }
    finally { send.disabled = false; }
  });
  create.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const payload = { subject:subject.value, message:body.value };
      if (recipient.value) payload.recipientId = recipient.value;
      const result = await api('/threads', { method:'POST', body:JSON.stringify(payload) });
      subject.value = ''; body.value = '';
      notice.textContent = '問い合わせを保存しました。';
      await loadThreads(result.thread.id);
    } catch (error) { notice.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  (async () => {
    try {
      const context = await api('/context');
      userRole = context.user.role;
      const contacts = await api('/contacts');
      recipient.replaceChildren();
      if (userRole === 'seller') recipient.append(h('option', '', '運営者へ問い合わせ（サイト内）'));
      else recipient.append(h('option', '', '宛先を選択してください'));
      (contacts.contacts || []).forEach((contact) => {
        const option = h('option', '', contact.display_name + (contact.role === 'seller' ? '（販売者）' : contact.role === 'buyer' ? '（購入者）' : ''));
        option.value = contact.id; recipient.append(option);
      });
      if (userRole !== 'seller') recipient.required = true;
      await loadThreads();
    } catch (error) {
      notice.textContent = 'ログインするとサイト内メッセージを利用できます。' + (error.message ? ' ' + error.message : '');
      create.hidden = true; layout.hidden = true;
    }
  })();
})();