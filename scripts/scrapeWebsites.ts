import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

// Configuración de URLs a extraer (Plataforma Local + Sitio Oficial)
const TARGET_PAGES = [
  // --- FUENTE 1: Tu plataforma local ---
  { name: "local_inicio", url: "http://localhost:3000" },
  { name: "local_acerca", url: "http://localhost:3000/acerca" },
  { name: "local_estudiantes", url: "http://localhost:3000/estudiantes" },
  { name: "local_oferta_academica", url: "http://localhost:3000/oferta-academica" },
  { name: "local_ingenieria_industrial", url: "http://localhost:3000/oferta-academica/ingenieria-industrial" },
  { name: "local_ingenieria_sistemas", url: "http://localhost:3000/oferta-academica/ingenieria-sistemas" },
  { name: "local_ingenieria_informatica", url: "http://localhost:3000/oferta-academica/ingenieria-informatica" },
  { name: "local_ingenieria-electromecanica", url: "http://localhost:3000/oferta-academica/ingenieria-electromecanica" },
  { name: "local_ingenieria_administracion", url: "http://localhost:3000/oferta-academica/ingenieria-administracion" },
  { name: "local_ingenieria_electronica", url: "http://localhost:3000/oferta-academica/ingenieria-electronica" }
  // Agrega aquí más rutas de tu plataforma local si existen (ej. http://localhost:3000/carreras)

  
  // Puedes agregar cualquier otra URL oficial del TESCHA aquí
];

const DOCUMENTS_DIR = path.join(process.cwd(), "documents");

async function scrapeUrl(name: string, targetUrl: string) {
  try {
    console.log(`🌐 Extrayendo datos de: ${targetUrl}...`);
    
    const { data: html } = await axios.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });

    const $ = cheerio.load(html);

    // Eliminar etiquetas de navegación, scripts y estilos para no ensuciar la IA
    $("script, style, nav, footer, iframe, header, noscript, svg").remove();

    // Extraer texto del contenido principal
    let extractedText = $("main, body").text();

    // Limpiar espacios en blanco excesivos y saltos de línea repetidos
    extractedText = extractedText.replace(/\s+/g, " ").trim();

    if (!extractedText || extractedText.length < 50) {
      console.log(`⚠️ Poco texto encontrado en ${targetUrl}, se omite.`);
      return;
    }

    if (!fs.existsSync(DOCUMENTS_DIR)) {
      fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
    }

    // Guardar como archivo de texto plano en /documents
    const filePath = path.join(DOCUMENTS_DIR, `web_${name}.txt`);
    fs.writeFileSync(filePath, extractedText, "utf-8");
    console.log(`✅ Archivo generado: documents/web_${name}.txt`);

  } catch (error: any) {
    console.error(`❌ Error al extraer ${targetUrl}:`, error.message);
  }
}

async function startScraping() {
  console.log("🚀 Iniciando extracción web...");
  for (const page of TARGET_PAGES) {
    await scrapeUrl(page.name, page.url);
  }
  console.log("\n🎉 Scraping finalizado con éxito.");
  console.log("👉 Siguiente paso: ejecuta el script de indexación para subir los nuevos datos a ChromaDB.");
}

startScraping();