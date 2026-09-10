import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

let initialized = false;

export async function ensureTramitesTable(): Promise<void> {
  if (initialized) return;
  const client = getPool();
  await client.query(`
    CREATE TABLE IF NOT EXISTS tramites (
      folio TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      matricula TEXT NOT NULL,
      tipo TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'recibido',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await client.query(`ALTER TABLE tramites ADD COLUMN IF NOT EXISTS carrera TEXT NOT NULL DEFAULT '';`);
  await client.query(`ALTER TABLE tramites ADD COLUMN IF NOT EXISTS semestre INTEGER NOT NULL DEFAULT 1;`);
  await client.query(`ALTER TABLE tramites ADD COLUMN IF NOT EXISTS turno TEXT NOT NULL DEFAULT 'matutino';`);
  await client.query(`ALTER TABLE tramites ADD COLUMN IF NOT EXISTS correo TEXT NOT NULL DEFAULT '';`);
  await client.query(`ALTER TABLE tramites ADD COLUMN IF NOT EXISTS fecha_en_proceso TIMESTAMPTZ;`); // 👈 nuevo
  await client.query(`ALTER TABLE tramites ADD COLUMN IF NOT EXISTS fecha_resuelto TIMESTAMPTZ;`);    // 👈 nuevo
  initialized = true;
}