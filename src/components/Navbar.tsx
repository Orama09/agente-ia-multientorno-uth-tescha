"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="w-full fixed top-0 left-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">

      <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center text-white">

        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-lg tracking-wide">
          <GraduationCap className="text-green-400" size={24} />
          TESCHA
        </div>

        {/* Menu */}
        <div className="hidden md:flex gap-8 text-sm font-medium">

          <Link
            href="/"
            className="hover:text-green-300 transition duration-300"
          >
            Inicio
          </Link>

          <Link
            href="/acerca"
            className="hover:text-green-300 transition duration-300"
          >
            Acerca del TESCHA
          </Link>

          <Link
            href="/estudiantes"
            className="hover:text-green-300 transition duration-300"
          >
            Estudiantes
          </Link>

          <Link
            href="/oferta-academica"
            className="hover:text-green-300 transition duration-300"
          >
            Oferta Académica
          </Link>

        </div>
      </div>
    </nav>
  );
}