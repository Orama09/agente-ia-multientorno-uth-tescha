"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="relative h-[65vh] flex items-center bg-cover bg-center"
      style={{ backgroundImage: "url('/images/tescha.png')" }}
    >
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Contenido */}
      <div className="relative z-10 max-w-4xl px-10 pt-28 text-white">

        <p className="text-base uppercase tracking-widest text-green-300 mb-3">
          Tecnologíco de Estudios Superiores de Chalco
        </p>

        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Bienvenido al Asistente Virtual <br />
          del TESCHA
        </h1>

        <p className="text-lg text-gray-200 max-w-xl mb-10">
          Formación de profesionales altamente capacitados en ingeniería,
          innovación tecnológica y desarrollo científico.
        </p>

        {/* Botones */}
        <div className="flex gap-4 flex-wrap">

          <Link href="/oferta-academica">
            <button className="bg-green-500 hover:bg-green-600 transition px-8 py-3 rounded-lg font-medium">
              Explorar Carreras
            </button>
          </Link>

        </div>

      </div>
    </section>
  );
}