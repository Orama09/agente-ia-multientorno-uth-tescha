"use client";

import { useState, useEffect } from "react";
import Hero from "../components/Hero";
import Link from "next/link";
import SplashScreen from "@/components/SplashScreen";

export default function Inicio() {
  const [openPDF, setOpenPDF] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 🔥 SPLASH */}
      {showSplash && (
        <SplashScreen />
      )}

      {/* 🧩 CONTENIDO */}
        <main className="bg-white text-gray-800">

          {/* HERO */}
          <Hero />

          {/* ================= CONVOCATORIA ================= */}
          <section className="bg-gradient-to-r from-green-600 to-green-400 text-white py-8 border-b-4 border-green-600/50">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">

              <div>
                <p className="uppercase text-sm md:text-sm tracking-widest opacity-90 font-medium">
                  Convocatoria
                </p>
                <h2 className="text-3xl md:text-3xl font-bold mt-1">
                  Proceso de Admisión 2026
                </h2>
                <p className="text-lg opacity-90 mt-1">
                  Consulta requisitos, fechas y documentación oficial.
                </p>
              </div>

              {/* BOTONES */}
              <div className="flex gap-3">
                <button
                  onClick={() => setOpenPDF(true)}
                  className="bg-white text-green-600 text-lg font-bold px-8 sm:px-12 md:px-20 py-3 rounded-lg shadow hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  Ver convocatoria
                </button>

              </div>

            </div>
          </section>

          {/* ================= ACCESOS RÁPIDOS ================= */}
          <section className="max-w-6xl mx-auto px-6 py-20">

            <h2 className="text-4xl md:text-4xl font-bold mb-16 text-center tracking-tight text-gray-800">
              Accesos Rápidos
            </h2>

            <div className="grid md:grid-cols-3 gap-8">

              {[
                {
                  title: "Oferta Académica",
                  desc: "Conoce las ingenierías disponibles en el TESCHA.",
                  img: "/images/oferta_academica.jpg",
                  link: "/oferta-academica",
                },
                {
                  title: "Estudiantes",
                  desc: "Información para alumnos inscritos.",
                  img: "/images/estudiantes.jpg",
                  link: "/estudiantes",
                },
                {
                  title: "Acerca del TESCHA",
                  desc: "Conoce más sobre nuestra institución.",
                  img: "/images/acerca_tescha.jpg",
                  link: "/acerca",
                },

              ].map((item, index) => (
                <Link key={index} href={item.link}>
                  <div className="group relative h-72 w-full rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 border-gray-100">

                    <div
                      className="absolute inset-0 bg-cover bg-center scale-100 group-hover:scale-110 transition-transform duration-700"
                      style={{ backgroundImage: `url(${item.img})` }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    <div className="relative z-10 h-full flex flex-col justify-end p-6">
                      <h3 className="text-white text-2xl font-semibold">
                        {item.title}
                      </h3>

                      <p className="text-gray-200 text-base mt-1">
                        {item.desc}
                      </p>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-green-500" />

                  </div>
                </Link>
              ))}

            </div>

          </section>

          {/* ================= AVISOS ================= */}
          <section className="bg-gray-200/50 py-20">
            <div className= "max-w-6xl mx-auto px-6">

              <h2 className="text-4xl font-bold mb-10">
                Avisos Institucionales
              </h2>

              <div className="grid md:grid-cols-3 gap-6">

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                  <h3 className="font-semibold text-xl text-green-600">
                    Inicio de inscripciones
                  </h3>
                  <p className="text-base text-gray-600 mt-2">
                    Las inscripciones al nuevo ciclo escolar comienzan en agosto.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                  <h3 className="font-semibold text-xl text-green-600">
                    Convocatoria disponible
                  </h3>
                  <p className="text-base text-gray-600 mt-2">
                    Ya puedes consultar la convocatoria oficial 2026.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
                  <h3 className="font-semibold text-xl text-green-600">
                    Servicios escolares
                  </h3>
                  <p className="text-base text-gray-600 mt-2">
                    Consulta trámites, constancias y procesos administrativos.
                  </p>
                </div>

              </div>

            </div>
          </section>

          {/* ================= SECCIÓN INSTITUCIONAL ================= */}
          <section className="py-20">
            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

              <div>
                <h2 className="text-4xl font-bold mb-4 text-gray-800">
                  Educación pública de calidad
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed text-lg">
                  El Tecnológico de Estudios Superiores ofrece formación académica
                  orientada al desarrollo profesional, innovación tecnológica y
                  vinculación con el sector productivo.
                </p>

                <ul className="text-lg text-gray-700 space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-700/20 text-green-600 flex items-center justify-center font-bold text-base">✓</span>
                  <span>Programas académicos actualizados</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-700/20 text-green-600 flex items-center justify-center font-bold text-base">✓</span>
                  <span>Infraestructura tecnológica</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-700/20 text-green-600 flex items-center justify-center font-bold text-base">✓</span>
                  <span>Vinculación empresarial</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-700/20 text-green-600 flex items-center justify-center font-bold text-base">✓</span>
                  <span>Formación integral</span>
                </li>
              </ul>
            </div>

            <div
              className="h-80 bg-cover bg-center rounded-3xl shadow-lg border border-[#E5D6A0]"
              style={{ backgroundImage: "url(/images/institucion.jpg)" }}
            />

          </div>
        </section>

          {/* ================= CTA ================= */}
          <section className="bg-gradient-to-r from-green-800 via-green-500 to-green-400 text-white py-24">
            <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold mb-4">
                  Forma parte del TESCHA
                </h2>

                <p className="mb-6 text-lg opacity-90">
                  Inicia tu proceso de admisión consultando la convocatoria oficial.
                </p>
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={() => setOpenPDF(true)}
                  className="bg-white text-green-600 text-lg font-bold px-10 py-4 rounded-xl shadow-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  Ver convocatoria
                </button>
              </div>
            </div>
            </section>

          {/* ================= MODAL PDF ================= */}
          {openPDF && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn">

              <div className="bg-white w-[95%] md:w-[75%] h-[85%] rounded-lg shadow-2xl overflow-hidden border-t-4 relative animate-scaleIn">

                {/* HEADER */}
                <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-100">
                  <h2 className="font-semibold text-gray-700">
                    Convocatoria TESCHA 2026
                  </h2>

                  <div className="flex items-center gap-3">

                    <button
                      onClick={() => setOpenPDF(false)}
                      className="text-gray-600 hover:text-black text-xl"
                    >
                      ✕
                    </button>

                  </div>
                </div>

                {/* PDF */}
                <iframe
                  src="/documents/convocatoria.pdf#zoom=page-width"
                  className="w-full h-full"
                />

              </div>
            </div>
          )}
        </main>
    </>
  );
}