// Uso PRIVADO LOCAL: npm.cmd run admin:bootstrap -- --correo admin@example.com --confirmar-admin-local
// Nunca registrar administradores desde endpoints publicos.
import 'dotenv/config';
import { pool } from '../db.js';
import { normalizeEmail, validEmail } from '../lib/security.js';
const args=process.argv.slice(2);
const at=args.indexOf('--correo');
const correo=at>=0?normalizeEmail(args[at+1]):'';
if(process.env.NODE_ENV==='production' || !args.includes('--confirmar-admin-local') || !validEmail(correo)) {
  console.error('Solo desarrollo local: --correo CORREO_VALIDO --confirmar-admin-local; prohibido con NODE_ENV=production.');
  process.exit(1);
}
if(!pool){ console.error('DATABASE_URL no configurada'); process.exit(1); }
const client=await pool.connect().catch(()=>null);
if(!client){console.error('No se pudo conectar a PostgreSQL'); process.exit(1);}
try {
  await client.query('BEGIN');
  const result=await client.query(`SELECT id,nombre,correo FROM usuarios WHERE lower(correo)=$1
    AND correo_verificado_en IS NOT NULL AND estado='activo' FOR UPDATE`,[correo]);
  if(result.rowCount!==1) throw Error('La cuenta no existe, no esta activa o no tiene correo verificado.');
  const assigned=await client.query(`INSERT INTO usuario_rol(usuario_id,rol_id)
    SELECT $1,id FROM roles WHERE codigo='administrador'
    ON CONFLICT DO NOTHING RETURNING rol_id`,[result.rows[0].id]);
  const rol=await client.query("SELECT 1 FROM roles WHERE codigo='administrador'");
  if(!rol.rowCount) throw Error('Falta ejecutar migracion 006.');
  await client.query('COMMIT');
  console.log(`Cuenta administrativa ${assigned.rowCount?'habilitada':'ya habilitada'} para ${result.rows[0].correo}.`);
  console.log('Cierra sesion y vuelve a ingresar para consultar /admin/instituciones.');
} catch(e){await client.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1;}
finally{client.release();await pool.end();}
