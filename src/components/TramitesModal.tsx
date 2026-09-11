"use client";

import { useState, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";
import { TRAMITE_TIPOS, TRAMITE_ESTADO_LABELS, TRAMITE_TURNOS, type Tramite, type TramiteTipo, type TramiteTurno } from "@/types/tramite";

type TramitesModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function TramitesModal({ open, onClose }: TramitesModalProps) {
  const [tab, setTab] = useState<"nueva" | "consultar">("nueva");

  const [nombre, setNombre] = useState("");
  const [matricula, setMatricula] = useState("");
  const [carrera, setCarrera] = useState("");
  const [semestre, setSemestre] = useState("");
  const [turno, setTurno] = useState<TramiteTurno>("matutino");
  const [correo, setCorreo] = useState("");
  const [tipo, setTipo] = useState<TramiteTipo>("constancia_estudios");
  const [descripcion, setDescripcion] = useState("");
  const [creando, setCreando] = useState(false);
  const [creado, setCreado] = useState<Tramite | null>(null);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false); // 👈 nuevo (punto 4)

  const [folioConsulta, setFolioConsulta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState<Tramite | null>(null);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);

  const resetFormularioNueva = () => {
    setNombre("");
    setMatricula("");
    setTipo("constancia_estudios");
    setCarrera("");
    setSemestre("");
    setTurno("matutino");
    setCorreo("");
    setDescripcion("");
    setCreado(null);
    setErrorCrear(null);
    setCopiado(false);
  };

  const resetConsulta = () => {
    setFolioConsulta("");
    setResultado(null);
    setErrorConsulta(null);
  };

  useEffect(() => {
    if (open) {
      resetFormularioNueva();
      resetConsulta();
      setTab("nueva");
    }
  }, [open]);

  if (!open) return null;

  const handleCrear = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorCrear(null);
    if (!nombre || !matricula || !carrera || !semestre || !turno || !correo || !tipo || !descripcion) {
      setErrorCrear("Completa todos los campos.");
      return;
    }
    setCreando(true);
    try {
      const res = await fetch("/api/tramites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, matricula, carrera, semestre, turno, correo, tipo, descripcion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear el trámite.");
      setCreado(data.tramite);
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setCreando(false);
    }
  };

  const handleConsultar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorConsulta(null);
    setResultado(null);
    if (!folioConsulta) {
      setErrorConsulta("Escribe un folio.");
      return;
    }
    setConsultando(true);
    try {
      const res = await fetch(`/api/tramites?folio=${encodeURIComponent(folioConsulta)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se encontró el trámite.");
      setResultado(data.tramite);
    } catch (err) {
      setErrorConsulta(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setConsultando(false);
    }
  };

  const handleCopiarFolio = async () => {
    if (!creado) return;
    try {
      await navigator.clipboard.writeText(creado.folio);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // ignore
    }
  };

  const resultadoResuelto =
    resultado?.estado === "completado" || resultado?.estado === "rechazado";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-1.5 rounded-lg text-base font-medium ${
              tab === "nueva" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
            onClick={() => {
              resetFormularioNueva(); // 👈 punto 1: siempre limpia al volver aquí
              setTab("nueva");
            }}
          >
            Nueva solicitud
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-base font-medium ${
              tab === "consultar" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
            onClick={() => setTab("consultar")}
          >
            Consultar estatus
          </button>
        </div>

        {tab === "nueva" && (
          <div className="space-y-3">
            {!creado ? (
              <form onSubmit={handleCrear} className="space-y-3">
                {/* 👇 punto 2: Enter dentro de este <form> ya envía automáticamente */}
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Nombre empezando por Apellidos" // 👈 punto 3
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onBlur={(e) => setNombre(e.target.value)}
                />
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Matrícula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  onBlur={(e) => setMatricula(e.target.value)}
                />
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Carrera"
                  value={carrera}
                  onChange={(e) => setCarrera(e.target.value)}
                  onBlur={(e) => setCarrera(e.target.value)}
                />
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  type="email"
                  placeholder="Correo institucional (para avisarte del resultado)"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  onBlur={(e) => setCorreo(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    className="w-1/2 border rounded-lg px-3 py-2 text-sm"
                    type="number"
                    min={1}
                    max={12}
                    placeholder="Semestre"
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value)}
                  />
                  <select
                    className="w-1/2 border rounded-lg px-3 py-2 text-sm"
                    value={turno}
                    onChange={(e) => setTurno(e.target.value as TramiteTurno)}
                  >
                    {TRAMITE_TURNOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TramiteTipo)}
                >
                  {TRAMITE_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Describe tu solicitud..."
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
                {errorCrear && <p className="text-red-600 text-sm">{errorCrear}</p>}
                <button
                  type="submit"
                  disabled={creando}
                  className="w-full bg-green-500 text-white rounded-lg py-2 text-base font-medium disabled:opacity-50"
                >
                  {creando ? "Enviando..." : "Enviar solicitud"}
                </button>
              </form>
            ) : (
              <div className="text-base space-y-2">
                <p className="text-green-700 font-semibold">✅ Solicitud registrada</p>
                <div className="flex items-center gap-2">
                  <p>
                    Tu folio es: <span className="font-mono font-bold">{creado.folio}</span>
                  </p>
                  {/* 👇 punto 4: copiar folio con un clic + aviso flotante */}
                  <button
                    onClick={handleCopiarFolio}
                    className="text-gray-500 hover:text-green-700 relative"
                    aria-label="Copiar folio"
                    type="button"
                  >
                    {copiado ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    {copiado && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                        ¡Copiado!
                      </span>
                    )}
                  </button>
                </div>
                <p className="text-gray-500 text-sm">Guarda este folio para consultar tu estatus.</p>

                {/* 👇 punto 7 */}
                <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  📬 Ojo a tu correo: ahí te avisaremos en cuanto tengamos novedades de tu solicitud o tramite.
                </p>

                {/* 👇 punto 8: aviso de 2 días hábiles, ya no hay descarga aquí */}
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  ⏳ Tu solicitud será atendida en un plazo máximo de 2 días hábiles. Podrás descargar o imprimir tu comprobante desde <strong>"Consultar estatus"</strong> una vez resuelta.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "consultar" && (
          <form onSubmit={handleConsultar} className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ej. TESCHA-A1B2C3"
              value={folioConsulta}
              onChange={(e) => setFolioConsulta(e.target.value)}
            />
            {errorConsulta && <p className="text-red-600 text-sm">{errorConsulta}</p>}
            <button
              type="submit"
              disabled={consultando}
              className="w-full bg-green-500 text-white rounded-lg py-2 text-base font-medium disabled:opacity-50"
            >
              {consultando ? "Buscando..." : "Buscar"}
            </button>
            {resultado && (
              <div className="text-sm border rounded-lg p-3 bg-gray-50 space-y-1">
                <p><span className="font-semibold">Folio:</span> {resultado.folio}</p>
                <p>
                  <span className="font-semibold">Estado:</span>{" "}
                  {TRAMITE_ESTADO_LABELS[resultado.estado]}
                </p>
                {resultadoResuelto ? (
                  <div className="space-y-1">
                    {resultado?.estado === "completado" && (
                      <p className="text-sm text-gray-700">
                        Ya puedes descargar tu comprobante. No olvides imprimir dos copias: una para el departamento y otra para el estudiante.
                      </p>
                    )}
                    <a
                      href={`/api/tramites/${resultado.folio}/comprobante`}
                      className="text-green-600 underline text-base font-medium hover:text-green-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Descargar comprobante PDF
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Tu comprobante estará disponible aquí en cuanto tu solicitud sea Completada o Rechazada.
                  </p>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

