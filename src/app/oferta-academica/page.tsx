import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const carreras = [
    { nombre: "Ingeniería Industrial", img: "/images/industrial.png" },
    { nombre: "Ingeniería Sistemas", img: "/images/sistemas.png" },
    { nombre: "Ingeniería Informática", img: "/images/informatica.png" },
    { nombre: "Ingeniería Electromecánica", img: "/images/electromecanica.png" },
    { nombre: "Ingeniería Administración", img: "/images/administracion.png" },
    { nombre: "Ingeniería Electrónica", img: "/images/electronica.png" },
  ];

  const generarSlug = (nombre: string) =>
    nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");

  return (
    <div>
      {/* HERO */}
      <section
        className="relative h-[50vh] flex items-center bg-cover bg-[center_20%]"
        style={{ backgroundImage: "url('/images/oferta_academica.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/70"></div>

        <div className="relative z-10 max-w-6xl px-8 pt-20 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Oferta Académica
          </h1>
          <p className="text-gray-200 max-w-2xl text-lg">
            Descubre las carreras y programas educativos que el TESCHA ofrece.
          </p>
        </div>
      </section>

      {/* CONTENIDO */}
      <main className="min-h-screen bg-gray-50 pt-16 pb-8 md:px-8">
        <section className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-green-500 uppercase tracking-wide mb-10">
            CARRERAS DIPOSNIBLES
          </h2>

          {/* Descripción a lo largo de las imágenes */}
          <div className="bg-white border border-green-200 rounded-3xl shadow-md p-8 md:p-6 mb-6 text-center">
            {/* Encabezado con birrete al lado del texto */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-4xl shadow-sm">
                🎓
              </div>
              <h3 className="text-2xl font-semibold text-green-600 tracking-tight">
                Formación que impulsa tu futuro
              </h3>
            </div>

            {/* Texto con menos espacio lateral */}
            <p className="text-gray-700 text-lg leading-relaxed text-justify mx-auto px-4 md:px-4">
              En esta sección podrás explorar las diferentes ingenierías que forman parte de la oferta académica del TESCHA. 
              Cada programa está diseñado para impulsar tu desarrollo profesional, fomentar la innovación y responder 
              a las necesidades del entorno productivo. <span className="text-green-600 font-semibold">Descubre las oportunidades</span> 
              que te permitirán transformar tu futuro y contribuir al progreso tecnológico y social.
            </p>
          </div>




          {/* Imágenes en dos columnas, mismo tamaño */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-10 justify-center scale-[0.90]">
            {carreras.map((carrera, index) => (
              <Link
                key={index}
                href={`/oferta-academica/${generarSlug(carrera.nombre)}`}
                className="block rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
              >
                <div className="relative w-full h-[250px] md:h-[270px] rounded-3xl">
                  <Image
                    src={carrera.img}
                    alt={carrera.nombre}
                    fill
                    className={`object-cover rounded-3xl transition-transform duration-500 hover:scale-105 ${
                      carrera.nombre.includes("Sistemas")
                        ? "object-[center_15%]"
                        : carrera.nombre.includes("Electrónica")
                        ? "object-[center_20%]"
                        : "object-center"
                    }`}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
