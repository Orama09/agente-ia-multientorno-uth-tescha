import { randomUUID } from "crypto";
import { getPool, ensureTramitesTable } from "./db";
import type { Tramite, TramiteEstado, TramiteTipo, TramiteTurno } from "@/types/tramite";

function generateFolio(): string {
  const code = randomUUID().split("-")[0].toUpperCase();
  return `TESCHA-${code}`;
}

function rowToTramite(row: any): Tramite {
  return {
    folio: row.folio,
    nombre: row.nombre,
    matricula: row.matricula,
    carrera: row.carrera,
    semestre: row.semestre,
    turno: row.turno,
    correo: row.correo,
    tipo: row.tipo,
    descripcion: row.descripcion,
    estado: row.estado,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    fechaEnProceso: row.fecha_en_proceso ? row.fecha_en_proceso.toISOString() : null,
    fechaResuelto: row.fecha_resuelto ? row.fecha_resuelto.toISOString() : null,
  };
}

export async function createTramite(input: {
  nombre: string;
  matricula: string;
  carrera: string;
  semestre: number;
  turno: TramiteTurno;
  correo: string;
  tipo: TramiteTipo;
  descripcion: string;
}): Promise<Tramite> {
  await ensureTramitesTable();
  const pool = getPool();
  const folio = generateFolio();

  const result = await pool.query(
    `INSERT INTO tramites (folio, nombre, matricula, carrera, semestre, turno, correo, tipo, descripcion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      folio,
      input.nombre.trim(),
      input.matricula.trim(),
      input.carrera.trim(),
      input.semestre,
      input.turno,
      input.correo.trim(),
      input.tipo,
      input.descripcion.trim(),
    ]
  );

  return rowToTramite(result.rows[0]);
}

export async function getTramiteByFolio(folio: string): Promise<Tramite | null> {
  await ensureTramitesTable();
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM tramites WHERE folio = $1`,
    [folio.trim().toUpperCase()]
  );

  return result.rows[0] ? rowToTramite(result.rows[0]) : null;
}

export async function updateTramiteEstado(
  folio: string,
  estado: TramiteEstado
): Promise<Tramite | null> {
  await ensureTramitesTable();
  const pool = getPool();

  // 👇 nuevo: registra la fecha exacta de cada transición de estado
  let extraSet = "";
  if (estado === "en_proceso") {
    extraSet = ", fecha_en_proceso = now()";
  } else if (estado === "completado" || estado === "rechazado") {
    extraSet = ", fecha_resuelto = now()";
  }

  const result = await pool.query(
    `UPDATE tramites SET estado = $1, updated_at = now()${extraSet}
     WHERE folio = $2
     RETURNING *`,
    [estado, folio.trim().toUpperCase()]
  );

  return result.rows[0] ? rowToTramite(result.rows[0]) : null;
}