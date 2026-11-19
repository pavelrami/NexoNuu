// Datos de demostracion para ver la plataforma funcionando.
// Uso:  npm.cmd run db:seed:demo -- --confirmar            (crea lo que falte; conserva contrasenas existentes)
//       npm.cmd run db:seed:demo -- --confirmar --reiniciar-claves   (genera contrasenas nuevas para las 3 cuentas)
// En un servidor con NODE_ENV=production agrega tambien --confirmar-produccion.
//
// Crea: una cuenta administradora, una cuenta institucional (representante de la
// "Institucion Demostrativa Nexo Nuu"), una cuenta voluntaria con perfil, comunidades
// reales de las ocho regiones y jornadas de demostracion (es_demo = TRUE, se muestran
// con la etiqueta "Demostracion"). Las contrasenas se guardan en credenciales-demo.local.txt
// (fuera de Git) y nunca en este archivo.
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { pool } from '../db.js';
import { hashPassword, normalizeEmail, validEmail } from '../lib/security.js';

const args = process.argv.slice(2);
if (!args.includes('--confirmar') || (process.env.NODE_ENV === 'production' && !args.includes('--confirmar-produccion'))) {
  console.error('Agrega --confirmar (y --confirmar-produccion si NODE_ENV=production) para crear los datos de demostracion.');
  process.exit(1);
}
if (!pool) { console.error('DATABASE_URL no configurada'); process.exit(1); }
const reiniciar = args.includes('--reiniciar-claves');

const CUENTAS = [
  { clave: 'admin', nombre: 'Administración Nexo Ñuu', correo: process.env.SEED_ADMIN_CORREO || 'admin@nexonuu.test', roles: ['administrador'] },
  { clave: 'institucion', nombre: 'Representante Institución Demostrativa', correo: process.env.SEED_INSTITUCION_CORREO || 'institucion@nexonuu.test', roles: ['representante'] },
  { clave: 'voluntario', nombre: 'Voluntaria de demostración', correo: process.env.SEED_VOLUNTARIO_CORREO || 'voluntario@nexonuu.test', roles: ['voluntario'] },
];
const INSTITUCION = 'Institución Demostrativa Nexo Ñuu';

// Comunidades reales de las ocho regiones de Oaxaca (nombre, municipio, region).
const COMUNIDADES = [
  ['San Bartolo Coyotepec', 'San Bartolo Coyotepec', 'Valles Centrales'],
  ['Teotitlán del Valle', 'Teotitlán del Valle', 'Valles Centrales'],
  ['Huajuapan de León', 'Heroica Ciudad de Huajuapan de León', 'Mixteca'],
  ['Juchitán de Zaragoza', 'Heroica Ciudad de Juchitán de Zaragoza', 'Istmo de Tehuantepec'],
  ['Guelatao de Juárez', 'Guelatao de Juárez', 'Sierra Norte'],
  ['Huautla de Jiménez', 'Huautla de Jiménez', 'Cañada'],
  ['San Juan Bautista Tuxtepec', 'San Juan Bautista Tuxtepec', 'Papaloapan'],
  ['Santa María Huatulco', 'Santa María Huatulco', 'Costa'],
  ['Miahuatlán de Porfirio Díaz', 'Miahuatlán de Porfirio Díaz', 'Sierra Sur'],
];

const AVISO = 'Jornada de demostración creada para mostrar cómo funciona Nexo Ñuu: no es una convocatoria real.';
// [titulo, comunidad, dias desde hoy, cupo, lenguas [[nombre, prioridad]], descripcion, estado]
const JORNADAS = [
  ['Círculo de lectura bilingüe en San Bartolo Coyotepec', 'San Bartolo Coyotepec', 9, 12, [['Zapoteco', 'deseable']],
    'Sesiones de lectura en voz alta y escritura de palabras cotidianas para personas adultas, con apoyo en español y zapoteco. Se buscan personas que acompañen la práctica y preparen materiales sencillos.', 'publicada'],
  ['Taller de lectura y escritura para personas adultas en Huajuapan', 'Huajuapan de León', 16, 15, [['Mixteco', 'deseable']],
    'Taller de dos días para reforzar la lectura y la escritura con ejercicios prácticos: recados, recetas y documentos de uso diario. Se valora hablar mixteco para acompañar a quienes lo prefieran.', 'publicada'],
  ['Jornada de alfabetización comunitaria en Juchitán', 'Juchitán de Zaragoza', 23, 20, [['Zapoteco', 'requerida']],
    'Jornada de acompañamiento a círculos de estudio en la comunidad. Las actividades se realizan en zapoteco del Istmo y en español, por lo que se requiere hablar zapoteco.', 'publicada'],
  ['Acompañamiento a círculos de estudio en Guelatao de Juárez', 'Guelatao de Juárez', 30, 10, [['Zapoteco', 'deseable']],
    'Apoyo a personas asesoras durante sesiones de lectura y escritura: organización del espacio, lectura compartida y registro de avances del grupo, sin datos personales.', 'publicada'],
  ['Elaboración de materiales de lectura en Huautla de Jiménez', 'Huautla de Jiménez', 37, 8, [],
    'Jornada para diseñar e imprimir tarjetas de palabras, carteles y cuadernillos de práctica con la comunidad. Ideal para personas con habilidades de diseño o ilustración.', 'publicada'],
  ['Jornada de apoyo logístico en centros comunitarios de Tuxtepec', 'San Juan Bautista Tuxtepec', 44, 14, [['Chinanteco', 'deseable']],
    'Apoyo en la organización de sesiones, registro de asistentes al círculo y difusión de horarios. Hablar chinanteco ayuda a comunicar la invitación a más familias.', 'publicada'],
  ['Círculo de lectura costero en Santa María Huatulco', 'Santa María Huatulco', 58, 12, [['Español', 'requerida']],
    'Lecturas breves y juegos de palabras para personas adultas que retoman sus estudios. Se busca apoyo para conducir actividades y preparar materiales.', 'publicada'],
  ['Difusión de servicios de alfabetización en Miahuatlán', 'Miahuatlán de Porfirio Díaz', 72, 10, [['Zapoteco', 'deseable']],
    'Jornada para informar a la comunidad sobre las opciones gratuitas de alfabetización que ya existen y cómo inscribirse. Incluye perifoneo y visitas a espacios públicos.', 'publicada'],
  ['Taller de escritura con personas mayores en Teotitlán del Valle', 'Teotitlán del Valle', 86, 10, [['Zapoteco', 'deseable']],
    'Borrador de jornada: taller de escritura de historias familiares con personas mayores. La institución lo revisará antes de publicarlo.', 'borrador'],
];

const generarClave = () => `Nexo-${randomBytes(9).toString('base64url')}`;
const fechaEn = (dias, hora) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  d.setUTCHours(hora + 6, 0, 0, 0); // hora local de Oaxaca (UTC-6)
  return d.toISOString();
};

const client = await pool.connect().catch(() => null);
if (!client) { console.error('No se pudo conectar a PostgreSQL'); process.exit(1); }
const claves = {};
try {
  await client.query('BEGIN');
  const roles = Object.fromEntries((await client.query('SELECT codigo, id FROM roles')).rows.map((r) => [r.codigo, r.id]));
  for (const r of ['voluntario', 'representante', 'administrador']) if (!roles[r]) throw new Error(`Falta el rol ${r}: aplica las migraciones 001 y 006.`);

  // 1. Cuentas
  const ids = {};
  for (const c of CUENTAS) {
    const correo = normalizeEmail(c.correo);
    if (!validEmail(correo)) throw new Error(`Correo invalido para ${c.clave}`);
    const previa = (await client.query('SELECT id FROM usuarios WHERE lower(correo)=$1', [correo])).rows[0];
    if (previa) {
      ids[c.clave] = previa.id;
      if (reiniciar) {
        claves[c.clave] = generarClave();
        await client.query("UPDATE usuarios SET password_hash=$1, estado='activo', correo_verificado_en=COALESCE(correo_verificado_en, now()) WHERE id=$2", [await hashPassword(claves[c.clave]), previa.id]);
      }
    } else {
      claves[c.clave] = generarClave();
      ids[c.clave] = (await client.query(`INSERT INTO usuarios (nombre, correo, password_hash, estado, correo_verificado_en)
        VALUES ($1,$2,$3,'activo',now()) RETURNING id`, [c.nombre, correo, await hashPassword(claves[c.clave])])).rows[0].id;
    }
    for (const rol of c.roles) {
      await client.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ids[c.clave], roles[rol]]);
    }
  }

  // 2. Institucion demostrativa verificada con su representante
  let inst = (await client.query('SELECT id FROM instituciones WHERE nombre=$1', [INSTITUCION])).rows[0];
  if (!inst) {
    inst = (await client.query(`INSERT INTO instituciones (nombre, tipo, descripcion, estado_verificacion)
      VALUES ($1,'Institución ficticia de prueba','Institución ficticia para demostrar el funcionamiento de Nexo Ñuu.','verificada') RETURNING id`, [INSTITUCION])).rows[0];
  } else {
    await client.query("UPDATE instituciones SET estado_verificacion='verificada' WHERE id=$1", [inst.id]);
  }
  await client.query(`INSERT INTO institucion_usuario (institucion_id, usuario_id, estado) VALUES ($1,$2,'activo')
    ON CONFLICT (institucion_id, usuario_id) DO UPDATE SET estado='activo'`, [inst.id, ids.institucion]);

  // 3. Comunidades
  const comunidad = {};
  for (const [nombre, municipio, region] of COMUNIDADES) {
    await client.query('INSERT INTO comunidades (nombre, municipio, region) VALUES ($1,$2,$3) ON CONFLICT (nombre, municipio) DO NOTHING', [nombre, municipio, region]);
    comunidad[nombre] = (await client.query('SELECT id FROM comunidades WHERE nombre=$1 AND municipio=$2', [nombre, municipio])).rows[0].id;
  }
  const lenguas = Object.fromEntries((await client.query('SELECT nombre, id FROM lenguas')).rows.map((l) => [l.nombre, l.id]));

  // 4. Jornadas de demostracion
  const jornadaId = {};
  let creadas = 0;
  for (const [titulo, comunidadNombre, dias, cupo, lenguasJ, descripcion, estado] of JORNADAS) {
    const existente = (await client.query('SELECT id FROM jornadas WHERE institucion_id=$1 AND titulo=$2', [inst.id, titulo])).rows[0];
    if (existente) { jornadaId[titulo] = existente.id; continue; }
    const j = (await client.query(`INSERT INTO jornadas (institucion_id, comunidad_id, creado_por, titulo, descripcion, inicio, fin, cupo, estado, es_demo, postulaciones_habilitadas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10) RETURNING id`,
      [inst.id, comunidad[comunidadNombre], ids.institucion, titulo, `${descripcion}\n\n${AVISO}`, fechaEn(dias, 10), fechaEn(dias, 14), cupo, estado, estado === 'publicada'])).rows[0];
    jornadaId[titulo] = j.id;
    creadas += 1;
    for (const [lengua, prioridad] of lenguasJ) {
      if (lenguas[lengua]) await client.query('INSERT INTO jornada_lengua (jornada_id, lengua_id, prioridad) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [j.id, lenguas[lengua], prioridad]);
    }
    await client.query(`INSERT INTO jornadas_historial (jornada_id, actor_id, accion, estado_anterior, estado_nuevo, motivo)
      VALUES ($1,$2,'creacion','borrador','borrador','Jornada de demostración creada por el script de datos de ejemplo')`, [j.id, ids.institucion]);
    if (estado === 'publicada') {
      await client.query(`INSERT INTO jornadas_historial (jornada_id, actor_id, accion, estado_anterior, estado_nuevo, motivo)
        VALUES ($1,$2,'publicacion','borrador','publicada','Publicación de la jornada de demostración')`, [j.id, ids.institucion]);
    }
  }

  // 5. Perfil de la cuenta voluntaria y dos postulaciones pendientes
  await client.query(`INSERT INTO perfiles_voluntario (usuario_id, comunidad_id, biografia, disponibilidad)
    VALUES ($1,$2,$3,'fin_semana') ON CONFLICT (usuario_id) DO NOTHING`,
  [ids.voluntario, comunidad['San Bartolo Coyotepec'], 'Cuenta de demostración: estudiante interesada en acompañar círculos de lectura los fines de semana.']);
  const habilidades = (await client.query("SELECT id FROM habilidades WHERE nombre IN ('Apoyo en actividades de lectura','Interpretación y comunicación bilingüe','Elaboración de materiales')")).rows;
  for (const h of habilidades) await client.query('INSERT INTO voluntario_habilidad (usuario_id, habilidad_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ids.voluntario, h.id]);
  for (const [lengua, nivel] of [['Español', 'fluido'], ['Zapoteco', 'conversacional']]) {
    if (lenguas[lengua]) {
      await client.query(`INSERT INTO voluntario_lengua (usuario_id, lengua_id, variante_id, nivel) VALUES ($1,$2,NULL,$3)
        ON CONFLICT DO NOTHING`, [ids.voluntario, lenguas[lengua], nivel]);
    }
  }
  for (const titulo of ['Círculo de lectura bilingüe en San Bartolo Coyotepec', 'Jornada de alfabetización comunitaria en Juchitán']) {
    await client.query(`INSERT INTO postulaciones (jornada_id, voluntario_id, estado) VALUES ($1,$2,'pendiente')
      ON CONFLICT (jornada_id, voluntario_id) DO NOTHING`, [jornadaId[titulo], ids.voluntario]);
  }

  await client.query('COMMIT');

  // 6. Credenciales fuera de Git
  if (Object.keys(claves).length) {
    const ruta = fileURLToPath(new URL('../../credenciales-demo.local.txt', import.meta.url));
    const lineas = [
      'NEXO ÑUU · CUENTAS DE DEMOSTRACIÓN (archivo local, NO subir a Git ni compartir)',
      `Generado: ${new Date().toISOString()}`,
      '',
      ...CUENTAS.filter((c) => claves[c.clave]).map((c) => `${c.clave.toUpperCase().padEnd(12)} ${normalizeEmail(c.correo)}   contraseña: ${claves[c.clave]}`),
      '',
      'Las cuentas que no aparecen aquí ya existían y conservan su contraseña.',
      'Para generar contraseñas nuevas: npm.cmd run db:seed:demo -- --confirmar --reiniciar-claves',
    ];
    await writeFile(ruta, `${lineas.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
    console.log(`Contraseñas guardadas en: ${ruta}`);
  } else {
    console.log('Las cuentas ya existían: se conservaron sus contraseñas (usa --reiniciar-claves para generar nuevas).');
  }
  console.log(`Listo: ${creadas} jornadas nuevas, ${COMUNIDADES.length} comunidades revisadas, 3 cuentas de demostración.`);
  if (process.env.ALLOW_DEMO_POSTULACIONES !== '1') {
    console.log('AVISO: agrega ALLOW_DEMO_POSTULACIONES=1 en backend/.env para que las jornadas de demostración acepten postulaciones.');
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('No se crearon los datos de demostración:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
