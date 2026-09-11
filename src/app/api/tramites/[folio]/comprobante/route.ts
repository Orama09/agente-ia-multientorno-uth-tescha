import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { getTramiteByFolio } from "@/lib/tramites/store";
import { TRAMITE_ESTADO_LABELS, TRAMITE_TIPOS, TRAMITE_TURNOS } from "@/types/tramite";
import fs from "fs/promises";
import path from "path";

const TZ = "America/Mexico_City";

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: TZ });
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { timeZone: TZ });
}

export async function GET(
  _req: Request,
  { params }: { params: { folio: string } }
) {
  const tramite = await getTramiteByFolio(params.folio);
  if (!tramite) {
    return Response.json({ error: "Trámite no encontrado." }, { status: 404 });
  }

  if (tramite.estado !== "completado" && tramite.estado !== "rechazado") {
    return Response.json(
      { error: "El comprobante estará disponible una vez que tu solicitud sea resuelta." },
      { status: 409 }
    );
  }

  const templateBytes = await fs.readFile(
    path.join(process.cwd(), "public", "documents", "templates", "hoja_membretada_tescha.pdf")
  );
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const tipoLabel =
    TRAMITE_TIPOS.find((t) => t.value === tramite.tipo)?.label ?? tramite.tipo;

  const yTipoFecha = height - 90;

  page.drawText(tipoLabel, {
    x: 180,
    y: yTipoFecha,
    size: 10,
    font: bold,
  });

  page.drawText(formatFecha(tramite.createdAt), {
    x: 380,
    y: yTipoFecha,
    size: 10,
    font: bold,
  });

  let y = height - 200;

  // Línea normal, alineada a la izquierda (como estaba originalmente)
  const drawLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: 50,
      y,
      size: opts?.size ?? 12,
      font: opts?.bold ? bold : font,
      color: rgb(0, 0, 0),
    });
    y -= 24;
  };

  // Solo para el Folio: alineada a la derecha
  const drawLineRight = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? 12;
    const usedFont = opts?.bold ? bold : font;
    const textWidth = usedFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: width - 50 - textWidth,
      y,
      size,
      font: usedFont,
      color: rgb(0, 0, 0),
    });
    y -= 24;
  };

  const drawWrapped = (
    text: string,
    opts: { size?: number; maxWidth?: number; usedFont?: PDFFont } = {}
  ) => {
    const size = opts.size ?? 11;
    const maxWidth = opts.maxWidth ?? width - 100;
    const usedFont = opts.usedFont ?? font;

    const words = text.split(/\s+/);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = usedFont.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        drawLine(line, { size });
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) drawLine(line, { size });
  };

  drawLineRight(`Folio: ${tramite.folio}`, { bold: true }); // 👈 único campo a la derecha

  drawLine(`Nombre: ${tramite.nombre}`);
  drawLine(`Matrícula: ${tramite.matricula}`);
  drawLine(`Carrera: ${tramite.carrera}`);
  drawLine(`Semestre: ${tramite.semestre}`);
  drawLine(`Turno: ${TRAMITE_TURNOS.find((t) => t.value === tramite.turno)?.label ?? tramite.turno}`);
  drawLine(`Correo de contacto: ${tramite.correo}`);
  y -= 6;
  drawLine(`Fecha de solicitud recibida: ${formatFechaHora(tramite.createdAt)}`);
  if (tramite.fechaEnProceso) {
    drawLine(`Fecha en proceso: ${formatFechaHora(tramite.fechaEnProceso)}`);
  }
  if (tramite.fechaResuelto) {
    const etiquetaResolucion = tramite.estado === "completado" ? "Completado" : "Rechazado";
    drawLine(`Fecha de ${etiquetaResolucion.toLowerCase()}: ${formatFechaHora(tramite.fechaResuelto)}`);
  }
  y -= 6;
  drawLine(`Estado actual: ${TRAMITE_ESTADO_LABELS[tramite.estado].toUpperCase()}`, { bold: true });
  y -= 10;
  drawLine("Descripción:", { bold: true });
  drawWrapped(tramite.descripcion, { size: 11 });

  const pdfBytes = await pdfDoc.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="comprobante-${tramite.folio}.pdf"`,
    },
  });
}