import Link from "next/link";

export default function Home() {

  const carreras = [
    {
      nombre: "Ingeniería Industrial",
      img: "/images/industrial.png",
      link: "/oferta-academica/industrial"
    },
    {
      nombre: "Ingeniería Sistemas",
      img: "/images/sistemas.png",
      link: "/oferta-academica/sistemas"
    },
    {
      nombre: "Ingeniería Informática",
      img: "/images/informatica.png",
      link: "/oferta-academica/informatica"
    },
    {
      nombre: "Ingeniería Electromecánica",
      img: "/images/electromecanica.png",
      link: "/oferta-academica/electromecanica"
    },
    {
      nombre: "Ingeniería Administración",
      img: "/images/administracion.png",
      link: "/oferta-academica/administracion"
    },
    {
      nombre: "Ingeniería Electrónica",
      img: "/images/electronica.png",
      link: "/oferta-academica/electronica"
    }
  ];

  return (
    <div>

      {/* HERO */}
      <section
        className="relative h-[50vh] flex items-center bg-cover bg-[center_20%]"
        style={{ backgroundImage: "url('/images/oferta_academica.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/70"></div>

        <div className="relative z-10 max-w-6xl px-8 pt-20 text-white">

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Oferta Académica
          </h1>

          <p className="text-gray-200 max-w-2xl text-lg">
            Descubre las carreras y programas educativos que el TESCHA ofrece.
          </p>

        </div>
      </section>

      {/* CONTENIDO */}
      <section className="max-w-7xl mx-auto py-20 px-6">

        <h2 className="text-3xl font-bold mb-10 text-center">
          Nuestras Carreras
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">

          {carreras.map((carrera, index) => (
            <Link
              key={index}
              href={carrera.link}
              className="group rounded-2xl overflow-hidden shadow-md 
                         hover:shadow-2xl transition duration-500 bg-white"
            >

              {/* Imagen */}
              <div className="w-full flex items-center justify-center bg-gray-100 p-6">
                <img
                  src={carrera.img}
                  alt={carrera.nombre}
                  className="max-w-full h-auto object-contain 
                             group-hover:scale-110 transition duration-500"
                />
              </div>

              {/* Texto */}
              <div className="p-6 text-center">

                <h3 className="text-lg font-semibold mb-2 
                               group-hover:text-green-600 transition">
                  {carrera.nombre}
                </h3>

                <div className="w-0 h-1 bg-green-500 mx-auto 
                                group-hover:w-16 transition-all duration-300">
                </div>

              </div>

            </Link>
          ))}

        </div>

      </section>

    </div>
  );
}
