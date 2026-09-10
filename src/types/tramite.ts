export type TramiteEstado = "recibido" | "en_proceso" | "completado" | "rechazado";

export type TramiteTurno = "matutino" | "vespertino";

export const TRAMITE_TURNOS: { value: TramiteTurno; label: string }[] = [
  { value: "matutino", label: "Matutino" },
  { value: "vespertino", label: "Vespertino" },
];

export type TramiteTipo =
  | "constancia_estudios"
  | "constancia_no_adeudo"
  | "reporte_problema"
  | "otro";

export type Tramite = {
  folio: string;
  nombre: string;
  matricula: string;
  carrera: string;
  semestre: number;
  turno: TramiteTurno;
  correo: string;
  tipo: TramiteTipo;
  descripcion: string;
  estado: TramiteEstado;
  createdAt: string;
  updatedAt: string;
  fechaEnProceso: string | null;   // 👈 nuevo
  fechaResuelto: string | null;    // 👈 nuevo
};

export const TRAMITE_TIPOS: { value: TramiteTipo; label: string }[] = [
  { value: "constancia_estudios", label: "Constancia de estudios" },
  { value: "constancia_no_adeudo", label: "Constancia de no adeudo" },
  { value: "reporte_problema", label: "Reporte de un problema" },
  { value: "otro", label: "Otro" },
];

export const TRAMITE_ESTADO_LABELS: Record<TramiteEstado, string> = {
  recibido: "Recibido",
  en_proceso: "En proceso",
  completado: "Completado",
  rechazado: "Rechazado",
};