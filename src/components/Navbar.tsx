"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/acerca", label: "Acerca del TESCHA" },
  { href: "/estudiantes", label: "Estudiantes" },
  { href: "/oferta-academica", label: "Oferta Académica" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full fixed top-0 left-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/10">

      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-24 flex justify-between items-center text-white w-full">

        {/* LOGO */}
        <div className="flex items-center gap-3 font-extrabold text-2xl sm:text-3xl tracking-wide">
          <GraduationCap className="text-green-400" size={36} />
          TESCHA
        </div>

        {/* MENÚ DESKTOP */}
        <div className="hidden md:flex gap-12 text-xl font-bold">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-green-300 transition duration-300"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* BOTÓN HAMBURGUESA (solo móvil) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 -mr-2 text-white"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* MENÚ MÓVIL DESPLEGABLE */}
      {open && (
        <div className="md:hidden bg-black/90 backdrop-blur-md border-t border-white/10">
          <div className="flex flex-col px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-white text-lg font-semibold py-3 border-b border-white/10 last:border-b-0 hover:text-green-300 transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

