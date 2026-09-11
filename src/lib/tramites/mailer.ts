import sgMail from "@sendgrid/mail";
import type { Tramite } from "@/types/tramite";
import { TRAMITE_TIPOS } from "@/types/tramite";

const HORARIO_CONTROL_ESCOLAR =
  "El horario de atención del Departamento de Control Escolar es de lunes a viernes, de 09:00 a 14:00 y de 15:00 a 18:00 hrs.";

function getFromEmail(): string | undefined {
  return process.env.SENDGRID_TO_EMAIL;
}

function ensureConfigured(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = getFromEmail();
  if (!apiKey || !from) {
    console.warn("⚠️ Notificación por correo no configurada, se omite el envío.");
    return false;
  }
  sgMail.setApiKey(apiKey);
  return true;
}

// 👇 nuevo: mensaje de resolución según tipo de trámite y estado final
function getResolutionMessage(tramite: Tramite): string {
  const esReporte = tramite.tipo === "reporte_problema";

  if (esReporte) {
    return tramite.estado === "completado"
      ? "Tu reporte fue revisado y atendido por nuestro equipo. Si el problema persiste, no dudes en generar un nuevo reporte."
      : "No fue posible darle seguimiento a tu reporte con la información proporcionada. Te invitamos a generar uno nuevo con más detalle, o acudir de manera presencial a las oficinas del TESCHA.";
  }

  return tramite.estado === "completado"
    ? `Puedes recoger tu documento en las oficinas del TESCHA dentro de los próximos 2 días hábiles. ${HORARIO_CONTROL_ESCOLAR}`
    : `Tu solicitud no pudo ser procesada. Puedes generar una nueva en un plazo de 2 días, o acudir de manera presencial a las oficinas del TESCHA. ${HORARIO_CONTROL_ESCOLAR}`;
}

function toHtmlEntities(str: string): string {
  const map: Record<string, string> = {
    "á": "&aacute;", "é": "&eacute;", "í": "&iacute;", "ó": "&oacute;", "ú": "&uacute;",
    "Á": "&Aacute;", "É": "&Eacute;", "Í": "&Iacute;", "Ó": "&Oacute;", "Ú": "&Uacute;",
    "ñ": "&ntilde;", "Ñ": "&Ntilde;",
    "ü": "&uuml;", "Ü": "&Uuml;",
    "°": "&deg;",
  };
  return str.replace(/[áéíóúÁÉÍÓÚñÑüÜ°]/g, (m) => map[m] ?? m);
}

export async function notifyNuevoTramite(tramite: Tramite): Promise<void> {
  const to = process.env.SENDGRID_TO_EMAIL;
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const adminKey = process.env.ADMIN_KEY;
  const from = getFromEmail();

  if (!to || !adminKey || !ensureConfigured()) return;

  const tipoLabel =
    TRAMITE_TIPOS.find((t) => t.value === tramite.tipo)?.label ?? tramite.tipo;

  const enlace = (estado: string) =>
    `${baseUrl}/api/tramites/${tramite.folio}/accion?estado=${estado}&key=${adminKey}`;

  try {
    await sgMail.send({
      to,
      from: from!,
      subject: `Nueva solicitud de trámite — Folio ${tramite.folio}`,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false },
      },
      html: toHtmlEntities(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
          </head>
          <body>
            <div style="font-family: sans-serif; max-width: 480px;">
              <h3>Nueva solicitud registrada</h3>
              <p><strong>Folio:</strong> ${tramite.folio}</p>
              <p><strong>Nombre:</strong> ${tramite.nombre}</p>
              <p><strong>Matrícula:</strong> ${tramite.matricula}</p>
              <p><strong>Carrera:</strong> ${tramite.carrera}</p>
              <p><strong>Semestre:</strong> ${tramite.semestre}°</p>
              <p><strong>Turno:</strong> ${tramite.turno}</p>
              <p><strong>Tipo:</strong> ${tipoLabel}</p>
              <p><strong>Descripción:</strong> ${tramite.descripcion}</p>
              <hr />
              <p>Acciones rápidas:</p>
              <p>
                <a href="${enlace("en_proceso")}" style="background:#f59e0b;color:white;padding:8px 14px;text-decoration:none;border-radius:6px;margin-right:6px;">Marcar en proceso</a>
                <a href="${enlace("completado")}" style="background:#16a34a;color:white;padding:8px 14px;text-decoration:none;border-radius:6px;margin-right:6px;">Marcar completado</a>
                <a href="${enlace("rechazado")}" style="background:#dc2626;color:white;padding:8px 14px;text-decoration:none;border-radius:6px;">Rechazar</a>
              </p>
            </div>
          </body>
        </html>
      `),
    });
    console.log(`✅ Correo interno enviado a ${to}`);
  } catch (error) {
    console.error("❌ Error enviando notificación por correo:", error);
  }
}

export async function notifyEstadoActualizado(tramite: Tramite): Promise<void> {
  const from = getFromEmail();
  if (!tramite.correo || !ensureConfigured()) return;

  const estadoLabel = tramite.estado === "completado" ? "Completado" : "Rechazado";
  const tipoLabel =
    TRAMITE_TIPOS.find((t) => t.value === tramite.tipo)?.label ?? tramite.tipo;
  const mensajeResolucion = getResolutionMessage(tramite);

  try {
    await sgMail.send({
      to: tramite.correo,
      from: from!,
      subject: `Actualización de tu trámite — Folio ${tramite.folio}`,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false },
      },
      html: toHtmlEntities(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
          </head>
          <body>
            <div style="font-family: sans-serif; max-width: 480px;">
              <p>Hola ${tramite.nombre},</p>
              <p>Tu trámite con folio <strong>${tramite.folio}:</strong> <strong>${tipoLabel}</strong> ha sido actualizado como: <strong>${estadoLabel}</strong>.</p>
              <p>${mensajeResolucion}</p>
              <p style="color:#6b7280; font-size:13px;">Puedes consultar el detalle e imprimir tu comprobante desde el portal usando tu folio.</p>
            </div>
          </body>
        </html>
      `),
    });
    console.log(`✅ Correo al estudiante enviado a ${tramite.correo}`);
  } catch (error) {
    console.error("❌ Error notificando al estudiante:", error);
  }
}