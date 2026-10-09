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


export async function sendSellerVerificationInstructionsEmail({ email, verificationUrl }, env = process.env) {
  const { transporter, from } = createTransport(env);
  await transporter.sendMail({
    from,
    to: email,
    subject: '販売者登録の承認と本人確認書類の提出について | VIDEO MARKETPLACE',
    text: [
      'VIDEO MARKETPLACEの販売者登録が承認されました。',
      '',
      '売上の出金申請を利用するには、本人確認書類の提出と運営者の承認が必要です。',
      '販売者アカウントにログインし、以下のページから本人確認書類を提出してください。',
      verificationUrl,
      '',
      'このメールに心当たりがない場合は、運営者へお問い合わせください。',
    ].join('\\n'),
    html: [
      '<p>VIDEO MARKETPLACEの販売者登録が承認されました。</p>',
      '<p>売上の出金申請を利用するには、本人確認書類の提出と運営者の承認が必要です。</p>',
      '<p><a href="' + verificationUrl + '">本人確認書類を提出する</a></p>',
      '<p>このメールに心当たりがない場合は、運営者へお問い合わせください。</p>',
    ].join(''),
  });
}
