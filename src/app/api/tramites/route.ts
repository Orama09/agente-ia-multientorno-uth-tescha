import { createTramite, getTramiteByFolio } from "@/lib/tramites/store";
import type { TramiteTipo } from "@/types/tramite";
import { notifyNuevoTramite } from "@/lib/tramites/mailer";

const TIPOS_VALIDOS: TramiteTipo[] = [
  "constancia_estudios",
  "constancia_no_adeudo",
  "reporte_problema",
  "otro",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, matricula, carrera, semestre, turno, correo, tipo, descripcion } = body;

    if (!nombre || !matricula || !carrera || !semestre || !turno || !correo || !tipo || !descripcion) {
      return Response.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return Response.json({ error: "Tipo de trámite no válido." }, { status: 400 });
    }

    const tramite = await createTramite({
      nombre,
      matricula,
      carrera,
      semestre: Number(semestre),
      turno,
      correo,
      tipo,
      descripcion,
    });

    void notifyNuevoTramite(tramite);

    return Response.json({ tramite }, { status: 201 });
  } catch (error) {
    console.error("❌ Error creando trámite:", error);
    return Response.json({ error: "Error interno al crear el trámite." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folio = searchParams.get("folio");

    if (!folio) {
      return Response.json({ error: "Debes proporcionar un folio." }, { status: 400 });
    }

    const tramite = await getTramiteByFolio(folio);

    if (!tramite) {
      return Response.json({ error: "No se encontró ningún trámite con ese folio." }, { status: 404 });
    }

    return Response.json({ tramite });
  } catch (error) {
    console.error("❌ Error consultando trámite:", error);
    return Response.json({ error: "Error interno al consultar el trámite." }, { status: 500 });
  }
}