import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import carrerasData from "@/data/carreras";

interface PageProps {
  params: { slug: string };
}

export default function CarreraPage({ params }: PageProps) {
  const slugLimpio = params.slug;
  const carrera = carrerasData[slugLimpio];

  if (!carrera) {
    return (
      <main className="min-h-screen bg-gray-50 pt-20 pb-16 px-6 md:px-12 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-lg">
          <h1 className="text-3xl font-bold text-gray-800 capitalize">
            {slugLimpio.replace(/-/g, " ")}
          </h1>
          <p className="text-gray-500">
            La información detallada para este programa se actualizará próximamente.
          </p>
          <Link
            href="/oferta-academica"
            className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-semibold transition-colors mt-4"
          >
            <ArrowLeft size={18} />
            Volver a Oferta Académica
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pt-8 pb-16 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        {/* BOTÓN REGRESAR */}
        <div className="mb-6">
          <Link
            href="/oferta-academica"
            className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-semibold transition-colors"
          >
            <ArrowLeft size={18} />
            Volver a Oferta Académica
          </Link>
        </div>

        {/* PORTADA */}
        <div className="relative w-full h-[350px] md:h-[450px] rounded-3xl overflow-hidden mb-10 shadow-lg bg-gray-900">
          <Image
            src={carrera.imagenPortada}
            alt={carrera.nombre}
            fill
            priority
            quality={100}
            sizes="(max-width: 1200px) 100vw, 1024px"
            className="object-cover object-center transform transition-transform duration-500 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        <div className="space-y-10">
          {/* ENCABEZADO */}
          <div>
            <span className="text-green-600 font-semibold text-lg uppercase tracking-wider">
              {carrera.subtitulo}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-1">
              {carrera.nombre}
            </h1>
          </div>

          {/* DESCRIPCIÓN */}
          {carrera.descripcion && (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-green-200 shadow-sm space-y-3">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <GraduationCap className="text-green-600" />
                Descripción del Programa
              </h2>
              <p className="text-gray-700 leading-relaxed font-medium text-base">
                {carrera.descripcion}
              </p>
            </div>
          )}

          {/* OBJETIVOS */}
          {carrera.objetivos && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 border-green-200">
                Objetivos del Programa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {carrera.objetivos.general && (
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm">
                    <h3 className="font-bold text-green-700 text-lg mb-2">
                      Objetivo General
                    </h3>
                    <p className="text-gray-700 leading-relaxed font-medium text-sm md:text-base">
                      {carrera.objetivos.general}
                    </p>
                  </div>
                )}
                {carrera.objetivos.especifico && (
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm">
                    <h3 className="font-bold text-green-700 text-lg mb-2">
                      Objetivo Específico
                    </h3>
                    <p className="text-gray-700 leading-relaxed font-medium text-sm md:text-base">
                      {carrera.objetivos.especifico}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PERFIL PROFESIONAL */}
          {(carrera.camposTrabajo || carrera.perfilProfesionalTexto) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 border-green-200">
                Perfil Profesional
              </h2>

              {carrera.perfilProfesionalTexto && (
                <p className="text-gray-700 leading-relaxed font-medium bg-white p-5 rounded-2xl border border-green-200 shadow-sm">
                  {carrera.perfilProfesionalTexto}
                </p>
              )}

              {carrera.camposTrabajo && carrera.camposTrabajo.length > 0 && (
                <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm">
                  <h3 className="font-bold text-green-700 text-lg mb-3">
                    Campo Ocupacional / Áreas de Desempeño
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
                    {carrera.camposTrabajo.map((campo, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="font-medium text-sm md:text-base">{campo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RETÍCULA */}
          {carrera.reticulaPdf && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 border-green-200">
                Retícula del Programa
              </h2>
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-green-200 shadow-sm">
                <iframe
                  src={carrera.reticulaPdf}
                  title={`Retícula de ${carrera.nombre}`}
                  className="w-full h-[600px] rounded-xl border border-gray-200"
                />
                <div className="mt-4 text-right">
                  <a
                    href={carrera.reticulaPdf}
                    download
                    className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-semibold transition-colors"
                  >
                    Descargar retícula en PDF
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
