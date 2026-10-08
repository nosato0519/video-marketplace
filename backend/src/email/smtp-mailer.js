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

export async function sendSellerVerificationEmail({ email, verificationUrl }, env = process.env) {
  const { transporter, from } = createTransport(env);
  await transporter.sendMail({
    from,
    to: email,
    subject: '販売者メールアドレスの確認 | VIDEO MARKETPLACE',
    text: [
      'VIDEO MARKETPLACEの販売者メールアドレス確認です。',
      '',
      '以下のリンクを開いてメールアドレスを確認してください。',
      verificationUrl,
      '',
      'このリンクは30分間有効です。',
      '心当たりがない場合は、このメールを破棄してください。',
    ].join('\n'),
    html: [
      '<p>VIDEO MARKETPLACEの販売者メールアドレス確認です。</p>',
      '<p>以下のリンクを開いてメールアドレスを確認してください。</p>',
      `<p><a href="${verificationUrl}">メールアドレスを確認する</a></p>`,
      '<p>このリンクは30分間有効です。</p>',
      '<p>心当たりがない場合は、このメールを破棄してください。</p>',
    ].join(''),
  });
}
