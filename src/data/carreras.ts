// Definimos la estructura de las carreras
interface Carrera {
  nombre: string;
  subtitulo?: string;
  imagenPortada: string;
  descripcion?: string;
  objetivos?: {
    general?: string;
    especifico?: string;
  };
  perfilProfesionalTexto?: string;
  camposTrabajo?: string[];
}

// Objeto con todas las carreras
const carrerasData: Record<string, Carrera> = {
  "ingenieria-industrial": {
    nombre: "Ingeniería Industrial",
    subtitulo: "Optimización de procesos",
    imagenPortada: "/images/industrial.png",
    descripcion:
      "Formar profesionistas capaces de diseñar, mejorar y administrar sistemas productivos.",
    objetivos: {
      general: "Desarrollar competencias para optimizar procesos industriales.",
      especifico: "Aplicar herramientas de calidad y productividad en organizaciones.",
    },
    perfilProfesionalTexto:
      "El egresado podrá desempeñarse en áreas de producción, logística y gestión de calidad.",
    camposTrabajo: ["Plantas industriales", "Consultoría en procesos", "Gestión de calidad"],
  },
  "ingenieria-sistemas": {
    nombre: "Ingeniería en Sistemas Computacionales",
    subtitulo: "Tecnologías de la información",
    imagenPortada: "/images/sistemas.png",
    descripcion:
      "Preparar profesionales en el desarrollo de software y administración de sistemas.",
    objetivos: {
      general: "Formar especialistas en tecnologías de la información.",
      especifico: "Diseñar y mantener sistemas computacionales eficientes.",
    },
    perfilProfesionalTexto:
      "El egresado podrá trabajar en desarrollo de software, administración de redes y seguridad informática.",
    camposTrabajo: ["Empresas de TI", "Consultoría tecnológica", "Administración de redes"],
  },
  "ingenieria-informatica": {
    nombre: "Ingeniería Informática",
    subtitulo: "Gestión de información digital",
    imagenPortada: "/images/informatica.png",
    descripcion: "Capacitar en el diseño y gestión de sistemas informáticos.",
    objetivos: {
      general: "Formar profesionales en informática aplicada.",
      especifico: "Implementar soluciones tecnológicas para la gestión empresarial.",
    },
    perfilProfesionalTexto:
      "El egresado podrá desempeñarse en análisis de datos, gestión documental y soporte tecnológico.",
    camposTrabajo: ["Empresas privadas", "Instituciones públicas", "Consultoría en TI"],
  },
  "ingenieria-electromecanica": {
    nombre: "Ingeniería Electromecánica",
    subtitulo: "Innovación en sistemas mecánicos y eléctricos",
    imagenPortada: "/images/electromecanica.png",
    descripcion:
      "Formar profesionistas capaces de diseñar, operar y mantener sistemas electromecánicos.",
    objetivos: {
      general: "Desarrollar competencias en el diseño y mantenimiento de sistemas electromecánicos.",
      especifico: "Aplicar conocimientos de mecánica y electricidad en la industria.",
    },
    perfilProfesionalTexto:
      "El egresado podrá desempeñarse en áreas de mantenimiento, diseño y operación de sistemas electromecánicos.",
    camposTrabajo: ["Industrias manufactureras", "Plantas de energía", "Consultoría técnica"],
  },
  "ingenieria-administracion": {
    nombre: "Ingeniería en Administración",
    subtitulo: "Gestión empresarial",
    imagenPortada: "/images/administracion.png",
    descripcion:
      "Formar profesionistas capaces de dirigir, organizar y optimizar recursos en empresas.",
    objetivos: {
      general: "Desarrollar competencias en gestión administrativa.",
      especifico: "Aplicar estrategias de liderazgo y toma de decisiones.",
    },
    perfilProfesionalTexto:
      "El egresado podrá desempeñarse en áreas de administración, finanzas y recursos humanos.",
    camposTrabajo: ["Empresas privadas", "Instituciones públicas", "Consultoría empresarial"],
  },
  "ingenieria-electronica": {
    nombre: "Ingeniería Electrónica",
    subtitulo: "Tecnología y circuitos",
    imagenPortada: "/images/electronica.png",
    descripcion:
      "Formar profesionistas capaces de diseñar, analizar y mantener sistemas electrónicos.",
    objetivos: {
      general: "Desarrollar competencias en el diseño de sistemas electrónicos.",
      especifico: "Aplicar conocimientos de electrónica en telecomunicaciones y automatización.",
    },
    perfilProfesionalTexto:
      "El egresado podrá desempeñarse en áreas de telecomunicaciones, automatización y diseño electrónico.",
    camposTrabajo: ["Empresas de telecomunicaciones", "Industria automotriz", "Consultoría en electrónica"],
  },
};

export default carrerasData;
