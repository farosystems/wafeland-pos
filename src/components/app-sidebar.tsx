"use client";

import {
  IconHome,
  IconPackage,
  IconCalendar,
  IconStack,
  IconCash,
  IconTransfer,
  IconUsers,
  IconReceipt,
  IconCalculator,
} from "@tabler/icons-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import React from "react";
import { getUsuarios } from "@/services/usuarios";
import { Usuario } from "@/types/usuario";
import { usePathname } from "next/navigation";

// sidebarItems ya no se usa, menúes son hardcodeados abajo


export function AppSidebar() {
  const { user, isSignedIn, isLoaded } = useUser();
  const [usuarioDB, setUsuarioDB] = React.useState<Usuario | null>(null);
  const [diasRestantes, setDiasRestantes] = React.useState<number | null>(null);
  const [stockOpen, setStockOpen] = React.useState(false);
  const [contactosOpen, setContactosOpen] = React.useState(false);
  const [ventasOpen, setVentasOpen] = React.useState(false);
  const [tesoreriaOpen, setTesoreriaOpen] = React.useState(false);
  const [sueldosOpen, setSueldosOpen] = React.useState(false);
  const pathname = usePathname();

  // Utilidades para saber si algún submenú está activo
  const isStockActive = ["/articles", "/movimientos-stock"].includes(pathname);
  const isContactosActive = ["/clientes", "/usuarios"].includes(pathname);
  const isVentasActive = ["/ventas", "/cuentas-corrientes"].includes(pathname);
  const isTesoreriaActive = ["/caja", "/gastos-empleados"].includes(pathname);
  const isSueldosActive = ["/liquidaciones", "/empleados"].includes(pathname);

  React.useEffect(() => {
    async function fetchUsuario() {
      if (user?.emailAddresses?.[0]?.emailAddress) {
        const usuarios = await getUsuarios();
        const usuario = usuarios.find(u => u.email === user.emailAddresses[0].emailAddress);
        setUsuarioDB(usuario || null);
        if (usuario && usuario.prueba_gratis) {
          const creado = new Date(usuario.creado_el);
          const hoy = new Date();
          const diffMs = hoy.getTime() - creado.getTime();
          const diffDias = 15 - Math.floor(diffMs / (1000 * 60 * 60 * 24));
          setDiasRestantes(diffDias > 0 ? diffDias : 0);
        } else {
          setDiasRestantes(null);
        }
      }
    }
    if (isLoaded && isSignedIn) {
      fetchUsuario();
    }
  }, [isLoaded, isSignedIn, user]);
  return (
    <aside className="flex flex-col h-full w-60 bg-white border-r">
      <div className="px-4 py-4 text-xs font-bold tracking-widest text-gray-700">
        LAPIPI POS
      </div>
      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          <li>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/dashboard" ? "bg-gray-200 text-black font-semibold w-[92%] ml-1" : "hover:bg-gray-100 text-black"}`}
              prefetch={false}
            >
              <IconHome className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          </li>
          {/* Menú Stock desplegable */}
          <li>
            <button
              type="button"
              className={`flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full focus:outline-none ${isStockActive ? "text-blue-600" : "text-gray-800"}`}
              onClick={() => setStockOpen((v) => !v)}
            >
              <IconStack className={`w-5 h-5 ${isStockActive ? "text-blue-600" : ""}`} />
              <span className="font-medium">Stock</span>
              <svg className={`ml-auto w-4 h-4 transition-transform ${stockOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {stockOpen && (
              <ul className="ml-8 mt-1 flex flex-col gap-1">
                <li className={`${pathname === "/articles" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/articles"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/articles" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconPackage className="w-4 h-4" />
                    <span>Productos</span>
                  </Link>
                </li>
                <li className={`${pathname === "/movimientos-stock" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/movimientos-stock"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/movimientos-stock" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconTransfer className="w-4 h-4" />
                    <span>Movimientos de stock</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          {/* Menú Contactos desplegable */}
          <li>
            <button
              type="button"
              className={`flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full focus:outline-none ${isContactosActive ? "text-blue-600" : "text-gray-800"}`}
              onClick={() => setContactosOpen((v) => !v)}
            >
              <IconUsers className={`w-5 h-5 ${isContactosActive ? "text-blue-600" : ""}`} />
              <span className="font-medium">Contactos</span>
              <svg className={`ml-auto w-4 h-4 transition-transform ${contactosOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {contactosOpen && (
              <ul className="ml-8 mt-1 flex flex-col gap-1">
                <li className={`${pathname === "/clientes" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/clientes"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/clientes" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconCalendar className="w-4 h-4" />
                    <span>Clientes</span>
                  </Link>
                </li>
                <li className={`${pathname === "/usuarios" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/usuarios"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/usuarios" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <User className="w-4 h-4" />
                    <span>Usuarios</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          {/* Menú Ventas desplegable */}
          <li>
            <button
              type="button"
              className={`flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full focus:outline-none ${isVentasActive ? "text-blue-600" : "text-gray-800"}`}
              onClick={() => setVentasOpen((v) => !v)}
            >
              <IconTransfer className={`w-5 h-5 ${isVentasActive ? "text-blue-600" : ""}`} />
              <span className="font-medium">Ventas</span>
              <svg className={`ml-auto w-4 h-4 transition-transform ${ventasOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {ventasOpen && (
              <ul className="ml-8 mt-1 flex flex-col gap-1">
                <li className={`${pathname === "/ventas" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/ventas"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/ventas" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconTransfer className="w-4 h-4" />
                    <span>Ventas</span>
                  </Link>
                </li>
                <li className={`${pathname === "/cuentas-corrientes" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/cuentas-corrientes"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/cuentas-corrientes" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconCash className="w-4 h-4" />
                    <span>Cuentas corrientes</span>
                  </Link>
                </li>
                <li className={`${pathname === "/pagos" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/pagos"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/pagos" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconCash className="w-4 h-4" />
                    <span>Pagos</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          {/* Menú Tesorería desplegable */}
          <li>
            <button
              type="button"
              className={`flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full focus:outline-none ${isTesoreriaActive ? "text-blue-600" : "text-gray-800"}`}
              onClick={() => setTesoreriaOpen((v) => !v)}
            >
              <IconCash className={`w-5 h-5 ${isTesoreriaActive ? "text-blue-600" : ""}`} />
              <span className="font-medium">Tesorería</span>
              <svg className={`ml-auto w-4 h-4 transition-transform ${tesoreriaOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {tesoreriaOpen && (
              <ul className="ml-8 mt-1 flex flex-col gap-1">
                <li className={`${pathname === "/caja" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/caja"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/caja" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconCash className="w-4 h-4" />
                    <span>Cajas</span>
                  </Link>
                </li>
                <li className={`${pathname === "/gastos-empleados" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                  <Link
                    href="/gastos-empleados"
                    className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/gastos-empleados" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                    prefetch={false}
                  >
                    <IconCash className="w-4 h-4" />
                    <span>Gastos de mi Comercio</span>
                  </Link>
                </li>
              </ul>
            )}
          </li>
          {/* Menú Sueldos desplegable */}
          {usuarioDB?.rol === "supervisor" && (
            <li>
              <button
                type="button"
                className={`flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full focus:outline-none ${isSueldosActive ? "text-blue-600" : "text-gray-800"}`}
                onClick={() => setSueldosOpen((v) => !v)}
              >
                <IconReceipt className={`w-5 h-5 ${isSueldosActive ? "text-blue-600" : ""}`} />
                <span className="font-medium">Sueldos</span>
                <svg className={`ml-auto w-4 h-4 transition-transform ${sueldosOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {sueldosOpen && (
                <ul className="ml-8 mt-1 flex flex-col gap-1">
                  <li className={`${pathname === "/liquidaciones" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                    <Link
                      href="/liquidaciones"
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/liquidaciones" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                      prefetch={false}
                    >
                      <IconCalculator className="w-4 h-4" />
                      <span>Liquidaciones</span>
                    </Link>
                  </li>
                  <li className={`${pathname === "/empleados" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                    <Link
                      href="/empleados"
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/empleados" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                      prefetch={false}
                    >
                      <IconUsers className="w-4 h-4" />
                      <span>Empleados</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>
      <div className="mt-auto p-4 flex flex-col items-start gap-2">
        {/* Contador de prueba gratis */}
        {usuarioDB && usuarioDB.prueba_gratis && diasRestantes !== null && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${diasRestantes <= 5 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-700"}`}
          >
            Prueba gratis: {diasRestantes} día{diasRestantes === 1 ? "" : "s"} restante{diasRestantes === 1 ? "" : "s"}
          </span>
        )}
        <span className="text-[10px] text-gray-400 mt-1">Versión 1.0</span>
        <div className="flex items-center gap-2 w-full">
          <UserButton afterSignOutUrl="/sign-in" />
          {isLoaded && isSignedIn && (
            <span className="text-sm font-medium">Hola, {usuarioDB?.nombre || user.firstName}</span>
          )}
        </div>
      </div>
    </aside>
  );
 }

