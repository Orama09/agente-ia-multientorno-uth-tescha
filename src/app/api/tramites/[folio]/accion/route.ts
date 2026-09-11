import { getTramiteByFolio, updateTramiteEstado } from "@/lib/tramites/store";
import { notifyEstadoActualizado } from "@/lib/tramites/mailer";
import type { TramiteEstado } from "@/types/tramite";

const ESTADOS_VALIDOS: TramiteEstado[] = ["recibido", "en_proceso", "completado", "rechazado"];
const ESTADOS_FINALES: TramiteEstado[] = ["completado", "rechazado"];

const ESTADO_STYLES: Record<TramiteEstado, { color: string; icono: string; label: string }> = {
  recibido: { color: "#2563eb", icono: "📥", label: "Recibido" },
  en_proceso: { color: "#d97706", icono: "⏳", label: "En proceso" },
  completado: { color: "#16a34a", icono: "✅", label: "Completado" },
  rechazado: { color: "#dc2626", icono: "❌", label: "Rechazado" },
};

function paginaHtml(mensaje: string, estado: TramiteEstado | null): string {
  const style = estado ? ESTADO_STYLES[estado] : { color: "#dc2626", icono: "⚠️", label: "" };

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style="margin:0; height:100vh; display:flex; align-items:center; justify-content:center; background:#f3f4f6; font-family: sans-serif;">
        <div style="background:white; padding:28px 36px; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.12); text-align:center; max-width:360px; border-top:5px solid ${style.color};">
          <div style="font-size:36px; margin-bottom:8px;">${style.icono}</div>
          <p style="color:${style.color}; font-weight:600; font-size:16px; margin:0 0 6px;">
            ${mensaje}
          </p>
          <p style="color:#9ca3af; font-size:12px; margin:0;">Esta ventana se cerrará automáticamente...</p>
        </div>
        <script>
          setTimeout(() => {
            window.close();
          }, 8000);
        </script>
      </body>
    </html>
  `;
}

export async function GET(
  req: Request,
  { params }: { params: { folio: string } }
) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") as TramiteEstado | null;
  const key = searchParams.get("key");

  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return new Response(paginaHtml("Enlace no válido o expirado.", null), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
    return new Response(paginaHtml("Estado no válido.", null), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 👇 nuevo: bloquea el link si el trámite ya fue resuelto antes
  const tramiteActual = await getTramiteByFolio(params.folio);

  if (!tramiteActual) {
    return new Response(paginaHtml("No se encontró el trámite.", null), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (ESTADOS_FINALES.includes(tramiteActual.estado)) {
    return new Response(
      paginaHtml(
        `Este trámite ya fue resuelto anteriormente (${ESTADO_STYLES[tramiteActual.estado].label}). El enlace ya no está disponible.`,
        tramiteActual.estado
      ),
      { status: 409, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const tramite = await updateTramiteEstado(params.folio, estado);

  if (!tramite) {
    return new Response(paginaHtml("No se encontró el trámite.", null), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (estado === "completado" || estado === "rechazado") {
    void notifyEstadoActualizado(tramite);
  }

  return new Response(
    paginaHtml(`Trámite ${tramite.folio} actualizado a: ${ESTADO_STYLES[estado].label}`, estado),
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}