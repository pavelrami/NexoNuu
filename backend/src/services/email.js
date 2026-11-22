// Envio de correos de Nexo Nuu.
// EMAIL_MODE=console  -> solo desarrollo: imprime el enlace en la terminal.
// EMAIL_MODE=smtp     -> cualquier servidor SMTP (Hostinger, Gmail con contrasena de aplicacion, Outlook...).
// EMAIL_MODE=resend   -> API de Resend con dominio verificado.
import nodemailer from 'nodemailer';

const APP_URL = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const mode = () => (process.env.EMAIL_MODE || 'console').toLowerCase();

let transport = null;
function smtpTransport() {
  if (transport) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('SMTP sin configurar: faltan SMTP_HOST, SMTP_USER o SMTP_PASS');
  const port = Number(SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

export function emailConfigurado() {
  const m = mode();
  if (m === 'console') return process.env.NODE_ENV !== 'production';
  if (m === 'smtp') return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM);
  if (m === 'resend') return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return false;
}

const escapar = (t = '') => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Plantilla con la identidad de la marca. Tablas y estilos en linea para que se vea bien en Gmail y Outlook.
function plantilla({ titulo, saludo, parrafos = [], boton, nota }) {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#13302a">${escapar(p)}</p>`).join('');
  const accion = boton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td style="border-radius:12px;background:#0d5c4e">
        <a href="${escapar(boton.url)}" style="display:inline-block;padding:14px 26px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px">${escapar(boton.texto)}</a>
      </td></tr></table>
      <p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#4c5f59">Si el boton no funciona, copia este enlace en tu navegador:<br><span style="word-break:break-all;color:#0d5c4e">${escapar(boton.url)}</span></p>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4efe3;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dfe6df">
    <tr><td style="background:#0a3b33;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:bold">&#9670; Nexo &Ntilde;uu</td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#13302a">${escapar(titulo)}</h1>
      ${saludo ? `<p style="margin:0 0 14px;font-size:15px;color:#13302a">${escapar(saludo)}</p>` : ''}
      ${cuerpo}${accion}
      ${nota ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#6b7c76">${escapar(nota)}</p>` : ''}
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f1f9f5;font-size:12px;color:#4c5f59">Nexo &Ntilde;uu conecta comunidades, instituciones y voluntariado por la alfabetizaci&oacute;n en Oaxaca.</td></tr>
  </table></td></tr></table></body></html>`;
}

function textoPlano({ titulo, saludo, parrafos = [], boton, nota }) {
  return [titulo, '', saludo, ...parrafos, boton ? `${boton.texto}: ${boton.url}` : '', nota].filter((x) => x !== undefined).join('\n\n');
}

export async function enviarCorreo({ to, subject, contenido, etiqueta = 'CORREO' }) {
  const m = mode();
  const html = plantilla(contenido);
  const text = textoPlano(contenido);
  if (m === 'console') {
    if (process.env.NODE_ENV === 'production') throw new Error('EMAIL_MODE=console no se permite en produccion');
    console.info(`\n[NEXO NUU - ${etiqueta} - SOLO DESARROLLO LOCAL]`);
    console.info(`Para: ${to}`);
    console.info(`Asunto: ${subject}`);
    if (contenido.boton) console.info(`Enlace: ${contenido.boton.url}`);
    console.info('Configura EMAIL_MODE=smtp para enviarlo a la bandeja real.\n');
    return { modo: 'console' };
  }
  if (!process.env.EMAIL_FROM) throw new Error('Falta EMAIL_FROM');
  if (m === 'smtp') {
    await smtpTransport().sendMail({ from: process.env.EMAIL_FROM, to, subject, text, html });
    return { modo: 'smtp' };
  }
  if (m === 'resend') {
    if (!process.env.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Proveedor de correo respondio ${response.status}`);
    return { modo: 'resend' };
  }
  throw new Error(`EMAIL_MODE desconocido: ${m}`);
}

export function sendVerificationEmail(to, token, nombre) {
  const url = `${APP_URL()}/verificar-correo?token=${encodeURIComponent(token)}`;
  return enviarCorreo({
    to, etiqueta: 'VERIFICACION', subject: 'Confirma tu correo · Nexo Ñuu',
    contenido: {
      titulo: 'Confirma tu correo electrónico',
      saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
      parrafos: ['Gracias por sumarte a Nexo Ñuu. Para activar tu cuenta, confirma que este correo es tuyo.'],
      boton: { texto: 'Confirmar mi correo', url },
      nota: 'El enlace funciona una sola vez y vence en 24 horas. Si no creaste una cuenta, ignora este mensaje.',
    },
  });
}

export function sendPasswordResetEmail(to, token, nombre) {
  const url = `${APP_URL()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
  return enviarCorreo({
    to, etiqueta: 'RECUPERACION', subject: 'Restablece tu contraseña · Nexo Ñuu',
    contenido: {
      titulo: 'Restablece tu contraseña',
      saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
      parrafos: ['Recibimos una solicitud para recuperar el acceso a tu cuenta. Elige una contraseña nueva desde el siguiente enlace.'],
      boton: { texto: 'Crear nueva contraseña', url },
      nota: 'El enlace funciona una sola vez y vence en 30 minutos. Al cambiar la contraseña se cerrarán tus sesiones abiertas. Si no lo pediste, ignora este mensaje: tu contraseña no cambia.',
    },
  });
}

export function sendApplicationDecisionEmail(to, { nombre, jornada, estado, institucion }) {
  const aceptada = estado === 'aceptada';
  return enviarCorreo({
    to, etiqueta: 'POSTULACION', subject: aceptada ? `Tu postulación fue aceptada · ${jornada}` : `Actualización de tu postulación · ${jornada}`,
    contenido: {
      titulo: aceptada ? '¡Tu postulación fue aceptada!' : 'Tu postulación no fue aceptada esta vez',
      saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
      parrafos: aceptada
        ? [`${institucion} aceptó tu solicitud para participar en «${jornada}».`, 'La institución se pondrá en contacto contigo para coordinar los detalles.']
        : [`${institucion} revisó tu solicitud para «${jornada}» y en esta ocasión no pudo aceptarla.`, 'Puedes explorar otras jornadas disponibles en Nexo Ñuu.'],
      boton: { texto: 'Ver mis postulaciones', url: `${APP_URL()}/mis-postulaciones` },
    },
  });
}

export function sendInstitutionDecisionEmail(to, { nombre, institucion, aprobada, motivo }) {
  return enviarCorreo({
    to, etiqueta: 'INSTITUCION', subject: aprobada ? `Tu institución fue verificada · ${institucion}` : `Revisión de tu solicitud · ${institucion}`,
    contenido: {
      titulo: aprobada ? '¡Tu institución fue verificada!' : 'Tu solicitud institucional no fue aprobada',
      saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
      parrafos: aprobada
        ? [`La administración de Nexo Ñuu verificó a «${institucion}» y te autorizó como su representante.`, 'Tu cuenta ahora es institucional: desde tu panel puedes publicar jornadas y revisar a las personas que se postulan. Cierra sesión y vuelve a entrar para ver tu nuevo panel.']
        : [`La administración revisó la solicitud de «${institucion}» y no pudo aprobarla.`, motivo ? `Motivo: ${motivo}` : 'Puedes enviar una nueva solicitud con información más completa.'],
      boton: { texto: aprobada ? 'Abrir mi panel institucional' : 'Ver mis solicitudes', url: `${APP_URL()}${aprobada ? '/panel-institucional' : '/instituciones/solicitar'}` },
    },
  });
}
