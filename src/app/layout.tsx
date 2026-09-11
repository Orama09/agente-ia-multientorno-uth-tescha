// @ts-ignore
import "./globals.css";
import Navbar from "@/components/Navbar";
import AgentDock from "@/components/AgentDock";
import Footer from "@/components/Footer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-gray-800 flex flex-col min-h-screen">
        
        <Navbar />

        {/* CONTENIDO + PANEL */}
        {/* pt-24: reserva el alto exacto del Navbar (h-24, fixed → fuera del
            flujo normal). Sin esto, el contenido empieza en y=0 y el Navbar
            queda flotando ENCIMA, tapando lo primero de cada página
            (incluida la parte superior del panel del avatar). */}
        <main className="flex flex-col lg:flex-row flex-1 pt-24">
          
          {/* CONTENIDO */}
          <div className="w-full lg:w-[70%]">
            {children}
          </div>

          {/* PANEL: altura fija; scroll interno solo en mensajes del chat */}
          {/* h-[calc(100vh-6rem)]: 100% del viewport MENOS el alto del Navbar
              (6rem = h-24), para que no se pase por debajo de la pantalla.
              lg:top-24: al volverse sticky, se pega justo debajo del Navbar
              en vez de en y=0 (que quedaría tapado por el Navbar fijo). */}
          <aside className=" w-full lg:w-[30%] bg-white border-t lg:border-l lg:border-t-0 lg:sticky lg:top-24 h-[calc(100vh-6rem)] flex flex-col overflow-hidden z-10">
            <AgentDock className="h-full flex-1 flex flex-col" />
          </aside>

        </main>

        {/* ✅ FOOTER GLOBAL */}
        <Footer />

      </body>
    </html>
  );
}
