import nodemailer from 'nodemailer';

function smtpConfig(env = process.env) {
  const host = String(env.SMTP_HOST || '').trim();
  const port = Number(env.SMTP_PORT || 587);
  const user = String(env.SMTP_USER || '').trim();
  const pass = String(env.SMTP_PASS || '');
  const from = String(env.SMTP_FROM || '').trim();
  const secure = String(env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from) {
    const error = new Error('email_smtp_configuration_missing');
    error.statusCode = 503;
    throw error;
  }
  return { host, port, secure, auth: { user, pass }, from };
}

function createTransport(env = process.env) {
  const config = smtpConfig(env);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  return { transporter, from: config.from };
}

export async function sendSellerVerificationInstructionsEmail({
  email,
  verificationUrl,
  operatorEmail = '',
  method = 'document',
  subject,
  body,
}, env = process.env) {
  const { transporter, from } = createTransport(env);
  const safeOperatorEmail = String(operatorEmail || '').trim().toLowerCase();
  const configuredFrom = String(from || '').trim();
  const configuredFromEmail = (configuredFrom.match(/<([^>]+)>/)?.[1] || configuredFrom).trim().toLowerCase();
  if (safeOperatorEmail && configuredFromEmail !== safeOperatorEmail) {
    const error = new Error('smtp_from_must_match_operator_email');
    error.statusCode = 503;
    throw error;
  }
  const defaultBody = method === 'email'
    ? `販売者登録が承認されました。本人確認が必要な場合は、本人確認書類を運営者メールアドレス（${safeOperatorEmail}）へ送信してください。`
    : `販売者登録が承認されました。本人確認が必要な場合は、販売者ページから本人確認書類を提出してください。\n${verificationUrl}`;
  const message = String(body || defaultBody)
    .replaceAll('{sellerEmail}', String(email || ''))
    .replaceAll('{verificationUrl}', String(verificationUrl || ''))
    .replaceAll('{operatorEmail}', safeOperatorEmail);
  const htmlMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  await transporter.sendMail({
    from,
    ...(safeOperatorEmail ? { replyTo: safeOperatorEmail } : {}),
    to: email,
    subject: String(subject || '販売者登録の承認と本人確認について | VIDEO MARKETPLACE')
      .replaceAll('{sellerEmail}', String(email || ''))
      .replaceAll('{verificationUrl}', String(verificationUrl || ''))
      .replaceAll('{operatorEmail}', safeOperatorEmail)
      .slice(0, 200),
    text: message,
    html: '<p>' + htmlMessage + '</p>',
  });
}

export async function sendSellerApplicationNotificationEmail({
  operatorEmail,
  sellerEmail,
  displayName,
  legalName,
  countryCode,
}, env = process.env) {
  const { transporter, from } = createTransport(env);
  const recipient = String(operatorEmail || '').trim().toLowerCase();
  const configuredFrom = String(from || '').trim();
  const configuredFromEmail = (configuredFrom.match(/<([^>]+)>/)?.[1] || configuredFrom).trim().toLowerCase();
  if (!recipient || configuredFromEmail !== recipient) {
    const error = new Error('smtp_from_must_match_operator_email');
    error.statusCode = 503;
    throw error;
  }

  const subject = '新しい販売者登録申請が届きました | VIDEO MARKETPLACE';
  const text = [
    '新しい販売者登録申請が届きました。',
    '',
    `メールアドレス：${String(sellerEmail || '')}`,
    `クリエイター名：${String(displayName || '')}`,
    `氏名：${String(legalName || '')}`,
    `国・地域コード：${String(countryCode || '')}`,
    '',
    '運営者ページから申請内容を確認してください。',
  ].join('\n');

  await transporter.sendMail({
    from,
    to: recipient,
    replyTo: String(sellerEmail || '').trim(),
    subject,
    text,
    html: '<p>' + text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>') + '</p>',
  });
}

