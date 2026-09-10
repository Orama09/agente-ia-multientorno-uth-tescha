"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="relative min-h-[65vh] flex items-center bg-cover bg-center py-10"
      style={{ backgroundImage: "url('/images/tescha.png')" }}
    >
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Contenido */}
      <div className="relative z-10 max-w-4xl px-6 sm:px-10 pt-16 sm:pt-28 text-white">

        <p className="text-base uppercase tracking-widest text-green-300 mb-3 font-medium">
          Tecnologíco de Estudios Superiores de Chalco
        </p>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
          Bienvenido al Asistente Virtual del TESCHA
        </h1>

        <p className="text-lg text-gray-200 max-w-xl mb-10">
          Formación de profesionales altamente capacitados en ingeniería,
          innovación tecnológica y desarrollo científico.
        </p>

        {/* Botones */}
        <div className="flex gap-4 flex-wrap">

          <Link href="/oferta-academica" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-green-500 hover:bg-green-600 transition px-8 py-3 rounded-lg font-medium shadow-md">
              Explorar Carreras
            </button>
          </Link>

        </div>

      </div>
    </section>
  );
}