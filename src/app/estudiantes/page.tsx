"use client";

import { useEffect, useState } from "react";

export default function Estudiantes() {

  const menu = [
    {
      title: "Reglamentos",
    },
    {
      title: "Servicios Escolares",
      submenu: [
        "Control Escolar",
        "Titulación",
        "Seguro Social",
      ],
    },
    {
      title: "Calendario Escolar",
    },
    {
      title: "Proceso de Reinscripción",
    },
  ];

  const [selectedPdf, setSelectedPdf] = useState("");

  const [active, setActive] = useState("");

  const formatId = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "-");

  /* ================= SCROLL ACTIVO ================= */
  useEffect(() => {

    const handleScroll = () => {

      const sections: string[] = [];

      menu.forEach((section) => {
        sections.push(section.title);

        if (section.submenu) {
          section.submenu.forEach((sub) => {
            sections.push(sub);
          });
        }
      });

      let currentSection = "";

      sections.forEach((item) => {

        const id = formatId(item);
        const el = document.getElementById(id);

        if (!el) return;

        const rect = el.getBoundingClientRect();

        if (
          rect.top <= 180 &&
          rect.bottom >= 180
        ) {
          currentSection = id;
        }

      });

      if (currentSection) {
        setActive(currentSection);
      }

    };

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);

  }, []);

  /* ================= SCROLL ================= */
  const scrollToSection = (id: string) => {

    const el = document.getElementById(id);

    if (!el) return;

    setActive(id);

    const y =
      el.getBoundingClientRect().top +
      window.pageYOffset -
      110;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });

  };

  return (
    <main className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <section
        className="relative h-[50vh] flex items-center bg-cover bg-[center_30%]"
        style={{ backgroundImage: "url('/images/estudiantes.jpg')" }}
      >

        <div className="absolute inset-0 bg-black/70"></div>

        <div className="relative z-10 max-w-6xl px-8 pt-20 text-white">

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Estudiantes
          </h1>

          <p className="text-gray-200 max-w-2xl text-lg">
            Consulta información importante, servicios y recursos académicos.
          </p>

        </div>

      </section>

      {/* CONTENIDO */}
      <section className="max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row gap-10">

        {/* ================= SIDEBAR ================= */}
        <aside className="lg:w-1/4">

          <div className="lg:sticky lg:top-24 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 overflow-hidden">

            <div className="bg-gradient-to-r from-green-600 to-green-500 px-5 py-4">
              <h2 className="text-white font-semibold">
                Secciones
              </h2>
            </div>

            <ul className="p-2">

              {menu.map((section, i) => {

                const id = formatId(section.title);

                return (
                  <div key={i}>

                    {/* MENU PRINCIPAL */}
                    <li
                      onClick={() => scrollToSection(id)}
                      className={`group px-4 py-3 text-sm rounded-xl cursor-pointer transition-all duration-300 flex justify-between items-center
                      ${
                        active === id
                          ? "bg-green-500 text-white shadow-md"
                          : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                      }`}
                    >

                      <span>{section.title}</span>

                      <span
                        className={`w-2 h-2 rounded-full transition-all duration-300
                        ${
                          active === id
                            ? "bg-white scale-100"
                            : "bg-green-500 opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100"
                        }`}
                      ></span>

                    </li>

                    {/* SUBMENU */}
                    {section.submenu && (

                      <ul className="ml-4 mt-2 mb-3 space-y-1 border-l border-green-200 pl-3">

                        {section.submenu.map((subitem, subIndex) => {

                          const subId = formatId(subitem);

                          return (
                            <li
                              key={subIndex}
                              onClick={() => scrollToSection(subId)}
                              className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-all duration-200
                              ${
                                active === subId
                                  ? "bg-green-50 text-green-700 font-medium"
                                  : "text-gray-600 hover:bg-green-50 hover:text-green-700"
                              }`}
                            >
                              {subitem}
                            </li>
                          );
                        })}

                      </ul>

                    )}

                  </div>
                );
              })}

            </ul>

          </div>

        </aside>

        {/* ================= SECCIONES ================= */}
        <div className="lg:w-3/4 space-y-10">

          {menu.map((section, i) => {

            const id = formatId(section.title);

            return (
              <div
                key={i}
                id={id}
                className="bg-white rounded-3xl shadow-md p-8 scroll-mt-32"
              >

                <h2 className="text-2xl font-bold text-green-600 mb-6 uppercase tracking-wide">
                  {section.title}
                </h2>

                {/* ================= REGLAMENTOS ================= */}
                {section.title === "Reglamentos" && (

                  <div className="space-y-10">

                    <p className="text-gray-600 text-justify leading-relaxed">
                      En esta sección podrás consultar los reglamentos y
                      lineamientos académicos-administrativos vigentes del
                      Tecnológico de Estudios Superiores de Chalco.
                    </p>

                    {/* REGLAMENTO */}
                    <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6">

                      <div className="mb-6">

                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 bg-green-600 rounded-full"></span>

                          <h3 className="text-xl font-semibold text-green-600">
                            Reglamento para Estudiantes
                          </h3>
                        </div>

                        <p className="text-sm text-gray-500">
                          SERA APLICABLE A MATRÍCULAS 2024-1 EN ADELANTE
                        </p>

                      </div>

                      <div className="w-full h-[600px] border border-gray-200 rounded-2xl overflow-hidden">
                        <iframe
                          src="/documents/REGLAMENTO ESTUDIANTES TESCHA_Autorizado por Junta Directiva.pdf"
                          className="w-full h-full"
                        />
                      </div>

                    </div>

                    {/* MANUAL */}
                    <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6">

                      <div className="mb-6">

                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 bg-green-600 rounded-full"></span>

                          <h3 className="text-xl font-semibold text-green-600">
                            Manual de Lineamientos Académicos Administrativos
                          </h3>
                        </div>

                        <p className="text-gray-600 text-justify space-y-4">
                          Documento que establece los lineamientos académicos y
                          administrativos aplicables a estudiantes del TESCHA.
                        </p>

                      </div>

                      <div className="w-full h-[600px] border border-gray-200 rounded-2xl overflow-hidden">
                        <iframe
                          src="/documents/manual-lineamientos-academico-administrativos.pdf"
                          className="w-full h-full"
                        />
                      </div>

                    </div>

                  </div>

                )}

                {/* ================= SERVICIOS ESCOLARES ================= */}
                {section.title === "Servicios Escolares" && (

                  <div className="space-y-6">

                    <p className="text-gray-600 leading-relaxed text-justify">
                      En esta sección podrás consultar los servicios disponibles
                      para la comunidad estudiantil.
                    </p>

                    <div className="grid gap-8">

                      {/* CONTROL ESCOLAR */}
                      <div
                        id={formatId("Control Escolar")}
                        className="scroll-mt-40 bg-gradient-to-br from-white to-green-50 border border-green-100 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                      >

                        <div className="flex items-center gap-4 mb-6">

                          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
                            📚
                          </div>

                          <div>
                            <h3 className="text-2xl font-semibold text-green-600">
                              Control Escolar
                            </h3>

                            <p className="text-gray-500 text-sm">
                              Servicios y trámites académicos
                            </p>
                          </div>

                        </div>

                        <div className="space-y-6">

                          <p className="text-gray-600 leading-relaxed">
                            El área de Control Escolar brinda atención a
                            estudiantes para realizar trámites académicos y
                            administrativos.
                          </p>

                          <div className="bg-white border border-green-100 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                              <h4 className="text-xl font-semibold text-green-600">
                                Horario de Atención
                              </h4>
                            </div>

                            <div className="space-y-1 text-gray-600">
                              <p>LUNES A VIERNES DE 9:00 A 14:00 Y DE 15:00 A 18:00 HRS.</p>
                            </div>

                          </div>

                          <div className="bg-white border border-green-100 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                              <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                              <h4 className="text-xl font-semibold text-green-600">
                                Guía de Difusión de Trámites y Servicios Escolares
                              </h4>
                            </div>

                            <div className="w-full h-[600px] border border-gray-200 rounded-2xl overflow-hidden">
                              <iframe
                                src="/documents/manual-tramites-servicios-control-escolar.pdf"
                                className="w-full h-full"
                              />
                            </div>

                          </div>

                        </div>

                      </div>

                      {/* TITULACION */}
                      <div
                        id={formatId("Titulación")}
                        className="scroll-mt-40 bg-gradient-to-br from-white to-green-50 border border-green-100 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                      >

                        <div className="flex items-center gap-4 mb-6">

                          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
                            🎓
                          </div>

                          <div>
                            <h3 className="text-2xl font-semibold text-green-600">
                              Titulación
                            </h3>

                            <p className="text-gray-500 text-sm">
                              Proceso de titulación
                            </p>
                          </div>

                        </div>

                        <div className="space-y-6">

                          <p className="text-gray-600 leading-relaxed">
                            Consulta información relacionada con el proceso de
                            titulación, requisitos y documentación necesaria.
                          </p>

                          <div className="bg-white border border-green-100 rounded-2xl p-6">

                            <div className="flex items-center gap-2 mb-5">
                              <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                              <h4 className="text-xl font-semibold text-green-600">
                                Díptico de Titulación 2026
                              </h4>
                            </div>

                            <div className="w-full h-[600px] border border-gray-200 rounded-2xl overflow-hidden">
                              <iframe
                                src="/documents/diptico-titulacion-2026.pdf"
                                className="w-full h-full"
                              />
                            </div>

                          </div>

                        </div>

                      </div>

                      {/* SEGURO SOCIAL */}
                      <div
                        id={formatId("Seguro Escolar")}
                        className="scroll-mt-40 bg-gradient-to-br from-white to-green-50 border border-green-100 rounded-3xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                      >

                        <div className="flex items-center gap-4 mb-6">

                          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">
                            🏥
                          </div>

                          <div>
                            <h3 className="text-2xl font-semibold text-green-600">
                              Seguro Escolar
                            </h3>

                            <p className="text-gray-500 text-sm">
                              Información IMSS
                            </p>
                          </div>

                        </div>

                        <div className="space-y-6">

                          <p className="text-gray-600 leading-relaxed">
                            Es un servicio que por decreto presidencial tiene derecho
                            todo estudiante de nivel medio superior o superior que
                            estudie en una institución pública y que no cuente con
                            ningún tipo de seguridad social como IMSS, ISSSTE,
                            ISSEMYM, entre otros.
                          </p>

                          <p className="text-gray-600 leading-relaxed">
                            Este seguro es proporcionado por el Instituto Mexicano
                            del Seguro Social y comprende atención médica,
                            quirúrgica, farmacéutica, hospitalaria y obstétrica.
                          </p>

                          <div className="bg-white border border-green-100 rounded-2xl p-6">

                            <h4 className="text-xl font-semibold text-green-600 mb-3">
                              Generar Número de Seguro Social
                            </h4>

                            <p className="text-gray-600 mb-5">
                              Genera tu seguro social dando clic en el siguiente enlace.
                            </p>

                            <a
                              href="https://www.imss.gob.mx/tramites/imss02008"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                            >
                              Ir al portal del IMSS
                            </a>

                          </div>

                        </div>

                      </div>

                    </div>

                  </div>

                )}

                {/* ================= CALENDARIO ================= */}
                {section.title === "Calendario Escolar" && (

                  <div className="space-y-8">

                    <p className="text-gray-600 leading-relaxed text-justify space-y-4">
                      Consulta el calendario escolar oficial correspondiente
                      al ciclo académico 2025-2026.
                    </p>

                    <div className="w-full h-[600px] border border-gray-200 rounded-2xl overflow-hidden">
                      <iframe
                        src="/documents/Calendario 2025-2026.pdf"
                        className="w-full h-full"
                      />
                    </div>

                  </div>

                )}

                {/* ================= REINSCRIPCION ================= */}
                {section.title === "Proceso de Reinscripción" && (

                  <div className="space-y-8">

                    <p className="text-gray-600 leading-relaxed text-justify">
                      En esta sección podrás consultar información relacionada
                      con el proceso de reinscripción, fechas importantes y
                      formatos necesarios para completar tu trámite.
                    </p>

                    {/* CONVOCATORIA */}
                    <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6">

                      <div className="mb-6">

                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 bg-green-600 rounded-full"></span>

                          <h3 className="text-2xl font-semibold text-green-600">
                            Convocatoria de Reinscripción
                          </h3>
                        </div>

                        <p className="text-sm text-gray-500 ml-6">
                          Consulta la convocatoria oficial vigente.
                        </p>

                      </div>

                      {/* VISOR PDF */}
                      <div className="w-full h-[600px] border border-gray-200 rounded-2xl overflow-hidden">
                        <iframe
                          src="/documents/convocatoria.pdf"
                          className="w-full h-full"
                        />
                      </div>

                    </div>

                    {/* FORMATOS */}
                    <div className="bg-white border border-gray-200 rounded-3xl p-6">

                      <div className="mb-6">

                        <div className="flex items-center gap-3 mb-2">
                          <span className="w-3 h-3 bg-green-600 rounded-full"></span>

                          <h3 className="text-2xl font-semibold text-green-600">
                            Formatos y Documentos descargables
                          </h3>
                        </div>

                        <p className="text-sm text-gray-500 ml-6">
                          Selecciona un documento para visualizarlo o descargarlo.
                        </p>

                      </div>

                      {/* BOTONES */}
                      <div className="grid md:grid-cols-2 gap-4 mb-8">

                        {/* WORD */}
                        <a
                          href="/documents/SGI_G3_1.2_SOLICITUD_FICHA_EXAMEN_ADM_2025Vfinal.docx"
                          download
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 text-left"
                        >
                          <div className="p-3 bg-blue-100 group-hover:bg-blue-200 text-blue-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>

                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-blue-700 transition">
                              Solicitud de Pre-registro
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Descargar documento Word
                            </p>
                          </div>
                        </a>
                        {/* PDF */}
                        <button
                          onClick={() =>
                            setSelectedPdf("/documents/SGI_G3_1.4_CONVENIO_CONEL_ESTUDIANTE.pdf")
                          }
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-2xl p-5 transition-all duration-300 text-left w-full"
                        >
                          <div className="p-3 bg-red-100 group-hover:bg-red-200 text-red-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </div>

                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-red-700 transition">
                              Convenio con el estudiante
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              Visualizar documento PDF
                            </p>
                          </div>
                        </button>

                        {/* PDF */}
                        <button
                          onClick={() =>
                            setSelectedPdf("/documents/PASOS PARA PAGO INSCRIPCIÓN DE NUEVO INGRESO.pdf")
                          }
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-2xl p-5 transition-all duration-300 text-left w-full"
                        >
                          <div className="p-3 bg-red-100 group-hover:bg-red-200 text-red-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-red-700 transition">
                              Instrucciones para pago de derechos
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Visualizar documento PDF
                            </p>
                          </div>
                        </button>

                        {/* PDF */}
                        <button
                          onClick={() =>
                            setSelectedPdf("/documents/ACUSE DE ENLACE DE REGLAMENTO DE ESTUDIANTES 2026.pdf")
                          }
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-2xl p-5 transition-all duration-300 text-left w-full"
                        >
                          <div className="p-3 bg-red-100 group-hover:bg-red-200 text-red-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </div>

                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-red-700 transition">
                              Acuse de reglamento de estudiantes
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Visualizar documento PDF
                            </p>
                          </div>
                        </button>

                        {/* PDF */}
                        <button
                          onClick={() =>
                            setSelectedPdf("/documents/ENTREGA DE ENLACE DE REGLAMENTO DE ESTUDIANTES 2026.pdf")
                          }
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-2xl p-5 transition-all duration-300 text-left w-full"
                        >
                          <div className="p-3 bg-red-100 group-hover:bg-red-200 text-red-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-red-700 transition">
                              Entrega de enlace de reglamento
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Visualizar documento PDF
                            </p>
                          </div>
                        </button>

                        {/* PDF */}
                        <button
                          onClick={() =>
                            setSelectedPdf("/documents/PASOS PARA PAGO EXAMEN DE ADMISION 2.pdf")
                          }
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-2xl p-5 transition-all duration-300 text-left w-full"
                        >
                          <div className="p-3 bg-red-100 group-hover:bg-red-200 text-red-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          
                          <div> 
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-red-700 transition">
                              Pago examen de admisión
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Visualizar documento PDF
                            </p>
                          </div>
                        </button>

                        {/* PDF */}
                        <button
                          onClick={() =>
                            setSelectedPdf("/documents/CUOTAS 2026.pdf")
                          }
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-2xl p-5 transition-all duration-300 text-left w-full"
                        >
                          <div className="p-3 bg-red-100 group-hover:bg-red-200 text-red-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-red-700 transition">
                              Cuotas 2026
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Visualizar documento PDF
                            </p>
                          </div>
                        </button>

                        {/* WORD */}
                        <a
                          href="/documents/SGI_G3_2.1_SOLICITUD_DE_REINSCRIPCIÓN_Y_CARGA_ACADÉMICA_2025.docx"
                          download
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 text-left"
                        >
                          <div className="p-3 bg-blue-100 group-hover:bg-blue-200 text-blue-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>

                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-blue-700 transition">
                              Solicitud de reinscripción y carga académica
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Descargar documento Word
                            </p>
                          </div>
                        </a>

                        {/* WORD */}
                        <a
                          href="/documents/SGI_G3_1.3_SOLICITUD_INSCRIPCIÓN_2025.docx"
                          download
                          className="group flex items-center gap-4 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-blue-300 rounded-2xl p-5 transition-all duration-300 text-left"
                        >
                          <div className="p-3 bg-blue-100 group-hover:bg-blue-200 text-blue-700 rounded-xl transition flex-shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>

                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 group-hover:text-blue-700 transition">
                              Solicitud de inscripción
                            </h4>

                            <p className="text-sm text-gray-500 mt-1">
                              Descargar documento Word
                            </p>
                          </div>
                        </a>
                        

                      </div>

                      {/* VISOR DINAMICO */}
                      {selectedPdf && (
                        <div className="w-full h-[600px] border border-gray-200 rounded-2xl overflow-hidden animate-in fade-in duration-300">
                          <iframe
                            src={selectedPdf}
                            className="w-full h-full"
                          />
                        </div>
                      )}

                    </div>

                  </div>

                )}

              </div>
            );
          })}

        </div>

      </section>

    </main>
  );
}