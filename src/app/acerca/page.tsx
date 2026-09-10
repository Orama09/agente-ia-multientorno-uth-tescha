"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Target, Eye, GraduationCap, Users, History, MapPin } from "lucide-react";

export default function Acerca() {
  const menu = [
    "Titular",
    "Antecedentes",
    "Objetivo, Misión y Visión",
    "Organigrama",
    "Ubicación",
  ];

  const [active, setActive] = useState("");

  const formatId = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "-");

  useEffect(() => {
    const handleScroll = () => {
      menu.forEach((item) => {
        const id = formatId(item);
        const el = document.getElementById(id);

        if (el) {
          const rect = el.getBoundingClientRect();

          if (
            rect.top <= window.innerHeight / 2 &&
            rect.bottom >= window.innerHeight / 2
          ) {
            setActive(id);
          }
        }
      });
    };

   window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);

    if (el) {
      setActive(id);

      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: "smooth",
      });
    }
  };

  return (
    <main className="bg-gray-50 min-h-screen">

      {/* HERO */}
      <section
        className="relative h-[50vh] flex items-center bg-cover bg-[center_10%]"
        style={{ backgroundImage: "url('/images/acerca.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/70"></div>

        <div className="relative z-10 max-w-6xl px-8 pt-20 text-white">

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Acerca del TESCHA
          </h1>

          <p className="text-gray-200 max-w-2xl text-lg">
            Conoce nuestra historia, misión y el compromiso con la excelencia académica.
          </p>

        </div>

      </section>

      {/* CONTENIDO */}
      <section className="max-w-7xl mx-auto px-6 py-16 flex flex-col lg:flex-row gap-10">

        {/* ================= SIDEBAR ================= */}
        <aside className="lg:w-1/4">

          <div className="lg:sticky lg:top-24 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 overflow-hidden">

            <div className="bg-gradient-to-r from-green-600 to-green-500 px-5 py-4">
              <h2 className="text-white font-semibold">
                Secciones
              </h2>
            </div>

            <ul className="p-2">

              {menu.map((item, i) => {

                const id = formatId(item);

                return (
                  <li
                    key={i}
                    onClick={() => scrollToSection(id)}
                    className={`group px-4 py-3 text-sm rounded-xl cursor-pointer transition-all duration-300 flex justify-between items-center
                    ${
                      active === id
                        ? "bg-green-500 text-white shadow-md"
                        : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    <span>{item}</span>

                    <span
                      className={`w-2 h-2 rounded-full transition-all duration-300
                      ${
                        active === id
                          ? "bg-white scale-100"
                          : "bg-green-500 opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100"
                      }`}
                    ></span>
                  </li>
                );
              })}
            </ul>

          </div>
        </aside>

        {/* ================= SECCIONES ================= */}
        <div className="lg:w-3/4 space-y-10">

          {/* TITULAR */}
          <div id={formatId("Titular")} className="bg-white rounded-2xl shadow-md p-8 scroll-mt-32">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              Información Institucional
            </h2>

            <p className="text-gray-600 leading-relaxed mb-4 text-justify">
              El Tecnológico de Estudios Superiores de Chalco (TESCHA), es una
              institución pública de educación superior con el fin de formar
              profesionistas emprendedores con visión de investigadores,
              científicos y tecnológicos.
            </p>

            <p className="text-gray-600 leading-relaxed mb-4 text-justify">
              Es una institución en la cual se busca proporcionar la más alta
              calidad educativa y tecnológica, con cobertura nacional, que
              integre la formación más humana y justa.
            </p>

            <p className="text-gray-600 leading-relaxed text-justify">
              Busca ser un pilar fundamental tecnológico del desarrollo
              sostenido y sustentable, que cuenta con carreras acreditadas,
              lo cual garantiza la excelencia académica y el prestigio
              institucional.
            </p>
          </div>

          {/* ANTECEDENTES */}
          <div id={formatId("Antecedentes")} className="bg-white rounded-2xl shadow-md p-8 scroll-mt-32">
            <div className="flex items-center gap-3 mb-6">
              <History className="text-green-600" size={30} />
              <h2 className="text-2xl font-bold text-green-600">
                ANTECEDENTES
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              
              <div className="text-gray-600 text-justify space-y-4">
                <p>
                  El municipio de Chalco se localiza en la zona oriente del Estado de México,
                  a 35 km de la Ciudad de México, lo que lo convierte en una región estratégica
                  por su cercanía con la capital del país.
                </p>

                <p>
                  A partir de la década de 1980, especialmente después del sismo de 1985,
                  Chalco experimentó un acelerado crecimiento demográfico debido al flujo
                  migratorio proveniente de la Ciudad de México. Este fenómeno transformó
                  el uso del suelo, pasando de una vocación agrícola a un desarrollo urbano
                  con incremento de viviendas, comercio e industria.
                </p>

                <p>
                  Durante los años 90 se impulsó el desarrollo económico mediante la creación
                  de corredores industriales, lo que incrementó la demanda de servicios,
                  empleo y educación especializada.
                </p>

                <p>
                  En este contexto surge el Tecnológico, el 8 de diciembre de 1998, como un
                  organismo público descentralizado del Gobierno del Estado de México,
                  iniciando con las carreras de Ingeniería Industrial e Ingeniería
                  Electromecánica. Posteriormente, en 2004, se integraron Ingeniería en
                  Sistemas Computacionales e Ingeniería Electrónica.
                </p>

                <p>
                  Su objetivo principal es formar profesionistas con capacidades críticas,
                  innovadoras y tecnológicas, capaces de responder a las necesidades del
                  entorno productivo y contribuir al desarrollo regional y nacional.
                </p>
              </div>

              <div className="w-full h-[300px] relative group overflow-hidden rounded-xl cursor-pointer">

                <Image
                  src="/images/chalco.jpg" // ruta dentro de /public
                  alt="Municipio de Chalco"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* OVERLAY (efecto oscuro al pasar el mouse) */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition duration-300"></div>

                {/* TEXTO ENCIMA */}
                <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition duration-300">
                  <p className="text-sm">Municipio de Chalco</p>
                </div>

              </div>

            </div>
          </div>

          {/* MISION, VISION Y OBJETIVO */}
          <div id={formatId("Objetivo, Misión y Visión")} className="space-y-6 scroll-mt-32">

            {/* OBJETIVO GENERAL */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Target className="text-green-600" size={30} />
                <h3 className="text-2xl font-bold text-green-600">
                  OBJETIVO INSTITUCIONAL
                </h3>
              </div>
              <p className="text-gray-600 text-base leading-relaxed text-justify mb-6">
                Proporcionar el servicio educativo de calidad, orientado a la
                satisfacción de los estudiantes.
              </p>

              <div className="w-full h-[200px] relative rounded-xl overflow-hidden group cursor-pointer">
  
                {/* IMAGEN */}
                <Image
                  src="/images/objetivo.jpg"
                  alt="TESCHA"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* OVERLAY OSCURO */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 transition duration-300"></div>

                {/* TEXTO ENCIMA */}
                <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition duration-300">
                  <p className="text-sm font-semibold">
                    Objetivo Institucional
                  </p>
                </div>
                
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              
              {/* MISIÓN */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="text-green-600" size={30} />
                  <h3 className="text-2xl font-bold text-green-600">
                    MISIÓN
                  </h3>
                </div>
                <p className="text-gray-600 text-base leading-relaxed text-justify">
                  Ofrecer servicios de educación superior tecnológica de calidad, con
                  cobertura nacional, pertinente y equitativa, que coadyuve a la
                  conformación de una sociedad más justa y humana.
                </p>
              </div>

              {/* VISIÓN */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="text-green-600" size={30} />
                  <h3 className="text-2xl font-bold text-green-600">
                    VISIÓN
                  </h3>
                </div>
                <p className="text-gray-600 text-base leading-relaxed text-justify">
                  Ser uno de los pilares fundamentales del desarrollo sostenido,
                  sustentable y equitativo de la nación.
                </p>
              </div>
            </div>

          </div>

          {/* ORGANIGRAMA */}
          <div id={formatId("Organigrama")} className="bg-white rounded-2xl shadow-md p-8 scroll-mt-32">
            
            <h2 className="text-2xl font-bold text-green-600 mb-6 flex items-center gap-2">
              <Users className="text-green-600" size={30} />
              ORGANIGRAMA
            </h2>

            <p className="text-gray-600 mb-6">
              Consulta la estructura organizacional del TESCHA. Puedes visualizar el documento directamente o descargarlo.
            </p>

            {/* VISOR PDF */}
            <div className="w-full h-[600px] border border-gray-200 rounded-xl overflow-hidden mb-6">
              <iframe
                src="/documents/organigrama2026.pdf"
                className="w-full h-full"
              />
            </div>

            {/* BOTÓN DESCARGA */}
            <div className="flex justify-end">
              <a
                href="/documents/organigrama2026.pdf"
                download
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition"
              >
                Descargar Organigrama
              </a>
            </div>

          </div>

          {/* UBICACION */}
          <div id={formatId("Ubicación")} className="bg-white rounded-2xl shadow-md p-8 scroll-mt-32">
            
            <h2 className="text-2xl font-bold text-green-600 mb-1 flex items-center gap-2">
              <MapPin className="text-green-600" size={30} />
              UBICACIÓN
            </h2>

            <div className="grid md:grid-cols-2 gap-8 items-start">

              {/* DATOS */}
              <div className="text-gray-600 space-y-3 text-base flex flex-col justify-center border-l-4 border-green-600 pl-6 py-2 bg-gray-50 rounded-r-xl">
                <p><span className="font-semibold text-green-600">Calle:</span> Carretera Federal México Cuautla s/n</p>
                <p><span className="font-semibold text-green-600">Colonia:</span> La Candelaria Tlapala</p>
                <p><span className="font-semibold text-green-600">Municipio:</span> Chalco, Estado de México</p>
                <p><span className="font-semibold text-green-600">C.P:</span> 56641</p>
                <p><span className="font-semibold text-green-600">Lada:</span> 555</p>
                <p><span className="font-semibold text-green-600">Teléfono:</span> 59821088 / 59821089</p>
                <p><span className="font-semibold text-green-600">Horario:</span> Lunes a viernes, 9:00–14:00 y 15:00–18:00 hrs.</p>
                <p><span className="font-semibold text-green-600">Sitio web:</span>{" "}
                  <a href="https://tescha.edomex.gob.mx/" className="text-blue-600 hover:underline">uth.hn</a>
                </p> 
                <p><span className="font-semibold text-green-600">Correo:</span>{" "}
                  <a href="mailto:depto.controlescolar@tesch.edu.mx" className="text-blue-600 hover:underline">depto.controlescolar@tesch.edu.mx</a>
                </p>
              </div>

              {/* MAPA */}
              <div className="w-full h-[350px] rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  src="https://www.google.com/maps?q=Tecnológico%20de%20Estudios%20Superiores%20de%20Chalco&output=embed"
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>

            </div>

          </div>

        </div>

      </section>
      
    </main>
  );
}