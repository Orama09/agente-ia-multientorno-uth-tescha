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
        <main className="flex flex-col lg:flex-row flex-1">
          
          {/* CONTENIDO */}
          <div className="w-full lg:w-[70%]">
            {children}
          </div>

          {/* PANEL */}
          <aside className="w-full lg:w-[30%] bg-gray-50 border-t 
          lg:border-l lg:border-t-0 lg:sticky lg:top-[70px] h-[calc(100vh-115px)]">
            <AgentDock className="h-[calc(100vh-80px)]" />
          </aside>

        </main>

        {/* ✅ FOOTER GLOBAL */}
        <Footer />

      </body>
    </html>
  );
}