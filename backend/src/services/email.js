const APP_URL = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

export async function sendVerificationEmail(to, token) {
  const url = `${APP_URL()}/verificar-correo?token=${encodeURIComponent(token)}`;
  const mode = process.env.EMAIL_MODE || 'console';
  if (mode === 'console') {
    if (process.env.NODE_ENV === 'production') throw new Error('EMAIL_MODE=console no se permite en produccion');
    console.info('\n[NEXO NUU - SOLO DESARROLLO LOCAL]');
    console.info(`Correo de prueba dirigido a ${to}`);
    console.info(`Enlace de verificacion (uso unico): ${url}`);
    console.info('NO compartir el enlace ni publicarlo en Git.\n');
    return;
  }
  if (mode !== 'resend' || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Proveedor de correo sin configurar');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: 'Confirma tu correo - Nexo Ñuu',
      text: `Bienvenido a Nexo Ñuu. Verifica tu correo mediante este enlace (válido 24 horas):\n\n${url}\n\nSi no solicitaste una cuenta, ignora este mensaje.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Proveedor de correo respondió ${response.status}`);
}

export async function sendPasswordResetEmail(to, token) {
  const url = `${APP_URL()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
  const mode = process.env.EMAIL_MODE || 'console';
  if (mode === 'console') {
    if (process.env.NODE_ENV === 'production') throw new Error('EMAIL_MODE=console no se permite en produccion');
    console.info('\n[NEXO NUU - RECUPERACION - SOLO DESARROLLO LOCAL]');
    console.info(`Correo de prueba dirigido a ${to}`);
    console.info(`Enlace de recuperacion (uso unico): ${url}`);
    console.info('NO compartir este enlace ni publicarlo en Git.\n');
    return;
  }
  if (mode !== 'resend' || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Proveedor de correo sin configurar');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: 'Restablece tu contrasena - Nexo Nuu',
      text: `Solicitaste recuperar el acceso a Nexo Nuu. Abre este enlace (valido por 30 minutos):\n\n${url}\n\nSi no hiciste esta solicitud, puedes ignorar este mensaje.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Proveedor de correo respondio ${response.status}`);
}
