export default function IndustrialPage() {
  return (
    <div>

      {/* HERO */}
      <section
        className="relative h-[50vh] flex items-center bg-cover bg-[center_80%]"
        style={{ backgroundImage: "url('/images/industrial.png')" }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/70"></div>

        {/* Contenido */}
        <div className="relative z-10 max-w-6xl px-8 pt-20 text-white">

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Ingeniería Industrial
          </h1>

          <p className="text-gray-200 max-w-2xl text-lg">
            Formación profesional enfocada en la optimización de procesos,
            sistemas productivos y mejora continua en las organizaciones.
          </p>

        </div>
      </section>

      {/* CONTENIDO */}
      <section className="max-w-5xl mx-auto py-20 px-6">

        {/* Descripción */}
        <p className="text-lg text-gray-600 mb-10 leading-relaxed">
          Esta carrera se enfoca en optimizar procesos, recursos y sistemas
          productivos para mejorar la eficiencia en las organizaciones.
        </p>

        {/* Secciones */}
        <div className="space-y-8">

          <div className="bg-white shadow-md rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-3 text-green-600">
              Campo laboral
            </h2>

            <p className="text-gray-600 leading-relaxed">
              Industria manufacturera, logística, control de calidad,
              administración de operaciones, consultoría y mejora continua.
            </p>
          </div>

          <div className="bg-white shadow-md rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-3 text-green-600">
              Perfil de egreso
            </h2>

            <p className="text-gray-600 leading-relaxed">
              Profesional capaz de analizar, diseñar y mejorar sistemas
              productivos, aplicando herramientas tecnológicas y metodologías
              innovadoras para la toma de decisiones.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}