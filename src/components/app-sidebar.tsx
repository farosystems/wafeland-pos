"use client";

import {
  IconPackage,
  IconCalendar,
  IconStack,
  IconCash,
  IconTransfer,
  IconUsers,
  IconReceipt,
  IconCalculator,
  IconPalette,
  IconReportAnalytics,
  IconUpload,
  IconShield,
  IconChartBar,
} from "@tabler/icons-react";
import { Shield } from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import React from "react";
import { getUsuarios } from "@/services/usuarios";
import { getModulosUsuario } from "@/services/permisos";
import { Usuario } from "@/types/usuario";
import { Modulo } from "@/types/permisos";
import { usePathname } from "next/navigation";

import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getConfiguracionEmpresa, updateConfiguracionEmpresa, uploadLogoEmpresa, ConfiguracionEmpresa } from "@/services/configuracion";
import { useColor } from "@/contexts/ColorContext";
import { Home } from "lucide-react";

// Paleta de colores para el selector
const DATABASE_COLORS = [
  { name: "Verde", value: "#22c55e", class: "bg-green-500" },
  { name: "Azul", value: "#3b82f6", class: "bg-blue-500" },
  { name: "Rojo", value: "#ef4444", class: "bg-red-500" },
  { name: "Púrpura", value: "#8b5cf6", class: "bg-purple-500" },
  { name: "Naranja", value: "#f97316", class: "bg-orange-500" },
  { name: "Teal", value: "#14b8a6", class: "bg-teal-500" },
  { name: "Rosa", value: "#ec4899", class: "bg-pink-500" },
  { name: "Indigo", value: "#6366f1", class: "bg-indigo-500" },
];

// sidebarItems ya no se usa, menúes son hardcodeados abajo


export function AppSidebar() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { selectedColor, setSelectedColor } = useColor();
  const [usuarioDB, setUsuarioDB] = React.useState<Usuario | null>(null);
  const [diasRestantes, setDiasRestantes] = React.useState<number | null>(null);
  const [stockOpen, setStockOpen] = React.useState(false);
  const [contactosOpen, setContactosOpen] = React.useState(false);
  const [ventasOpen, setVentasOpen] = React.useState(false);
  const [tesoreriaOpen, setTesoreriaOpen] = React.useState(false);
  const [sueldosOpen, setSueldosOpen] = React.useState(false);

  const [importacionesOpen, setImportacionesOpen] = React.useState(false);
  const [seguridadOpen, setSeguridadOpen] = React.useState(false);
  const [config, setConfig] = React.useState<ConfiguracionEmpresa | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [nombreEmpresa, setNombreEmpresa] = React.useState("");
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [modulosPermitidos, setModulosPermitidos] = React.useState<Modulo[]>([]);
  const pathname = usePathname();

  // Utilidades para saber si algún submenú está activo
  const isStockActive = ["/articles", "/movimientos-stock", "/stock-faltante"].includes(pathname);
  const isContactosActive = ["/clientes", "/usuarios"].includes(pathname);
  const isVentasActive = ["/ventas"].includes(pathname);
  const isTesoreriaActive = ["/caja", "/gastos-empleados"].includes(pathname);
  const isSueldosActive = ["/liquidaciones", "/empleados"].includes(pathname);

  const isImportacionesActive = ["/importacion-stock"].includes(pathname);
  const isSeguridadActive = ["/seguridad", "/seguridad/modulos"].includes(pathname);

  // Función para verificar si un módulo está permitido
  const isModuloPermitido = (nombreModulo: string): boolean => {
    if (!usuarioDB) {
      return false;
    }
    
    // Solo los administradores ven todo por defecto
    if (usuarioDB.rol === 'admin') {
      return true;
    }
    
    // Para otros roles (incluyendo supervisor), verificar permisos específicos
    return modulosPermitidos.some(modulo => modulo.nombre === nombreModulo);
  };

  React.useEffect(() => {
    function normalizeEmail(email?: string | null) {
      return (email || '').trim().toLowerCase();
    }
    async function fetchUsuario() {
      if (user?.emailAddresses?.[0]?.emailAddress) {
        const usuarios = await getUsuarios();
        const usuario = usuarios.find(u => normalizeEmail(u.email) === normalizeEmail(user.emailAddresses[0].emailAddress));
        setUsuarioDB(usuario || null);
        
        // Obtener módulos permitidos para el usuario
        if (usuario) {
          try {
            const modulos = await getModulosUsuario(usuario.id);
            setModulosPermitidos(modulos);
          } catch (error) {
            console.error("Error obteniendo módulos permitidos:", error);
            // Si hay error, mostrar todos los módulos (fallback)
            setModulosPermitidos([]);
          }
        }
        
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
    async function fetchConfig() {
      const c = await getConfiguracionEmpresa();
      setConfig(c);
      setNombreEmpresa(c?.nombre || "");
      setLogoPreview(c?.imagen || null);
    }
    if (isLoaded && isSignedIn) {
      fetchUsuario();
      fetchConfig();
    }
  }, [isLoaded, isSignedIn, user]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenModal = () => {
    setNombreEmpresa(config?.nombre || "");
    setLogoPreview(config?.imagen || null);
    setLogoFile(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    let logoUrl = config?.imagen || null;
    try {
      if (logoFile) {
        console.log("Iniciando subida de logo...");
        logoUrl = await uploadLogoEmpresa(logoFile);
        console.log("Logo subido exitosamente:", logoUrl);
      }
      console.log("Actualizando configuración de empresa...");
      await updateConfiguracionEmpresa(nombreEmpresa, logoUrl, selectedColor);
      setConfig({ ...config!, nombre: nombreEmpresa, imagen: logoUrl, color_primario: selectedColor });
      setModalOpen(false);
      console.log("Configuración guardada exitosamente");
    } catch (e: any) {
      console.error("Error completo en handleSave:", e);
      let errorMessage = "Error al guardar la configuración";
      
      if (e?.message) {
        errorMessage += ": " + e.message;
      } else if (e?.code) {
        errorMessage += ` (Código: ${e.code})`;
      } else if (typeof e === 'string') {
        errorMessage += ": " + e;
      } else {
        errorMessage += ": " + JSON.stringify(e);
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
          <aside className="flex flex-col h-full w-72 bg-white border-r">
      <div 
        className="px-4 py-3"
        style={{ backgroundColor: selectedColor }}
      >
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <div className="flex flex-row items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleOpenModal}>
              {config?.imagen ? (
                <img src={config.imagen} alt="Logo" className="w-8 h-8 rounded-full object-cover border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-sm border">?</div>
              )}
              <span className="font-bold text-sm truncate max-w-[120px]">{config?.nombre || "Nombre Empresa"}</span>
            </div>
          </DialogTrigger>
          <DialogContent preventOutsideClose>
            <DialogHeader>
              <DialogTitle>Configuración de la Empresa</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-medium">Nombre de la empresa</label>
              <Input value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} placeholder="Nombre de la empresa" />
              <label className="text-sm font-medium mt-2">Logo</label>
              <Input type="file" accept="image/*" onChange={handleLogoChange} />
              {logoPreview && (
                <img src={logoPreview} alt="Previsualización Logo" className="w-20 h-20 rounded-full object-cover border mt-2" />
              )}
              <label className="text-sm font-medium mt-2">Color del header</label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {DATABASE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor === color.value 
                        ? 'border-gray-800 scale-110' 
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {/* Enlace a Home - siempre visible */}
          <li>
            <Link
              href="/home"
              className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/home" ? "bg-gray-200 text-black font-semibold w-[92%] ml-1" : "hover:bg-gray-100 text-black"}`}
              prefetch={false}
            >
              <Home className="w-5 h-5" />
              <span>Inicio</span>
            </Link>
          </li>
          
          {isModuloPermitido('dashboard') && (
            <li>
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/dashboard" ? "bg-gray-200 text-black font-semibold w-[92%] ml-1" : "hover:bg-gray-100 text-black"}`}
                prefetch={false}
              >
                <IconChartBar className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
            </li>
          )}
          {/* Menú Stock desplegable */}
          {(isModuloPermitido('articulos') || isModuloPermitido('talles-colores') || isModuloPermitido('variantes-productos') || isModuloPermitido('movimientos-stock') || isModuloPermitido('stock-faltante')) && (
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
                  {isModuloPermitido('articulos') && (
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
                  )}
                  {isModuloPermitido('talles-colores') && (
                    <li className={`${pathname === "/talles-colores" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                      <Link
                        href="/talles-colores"
                        className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/talles-colores" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                        prefetch={false}
                      >
                        <IconPalette className="w-4 h-4" />
                        <span>Talles y colores</span>
                      </Link>
                    </li>
                  )}
                  {isModuloPermitido('variantes-productos') && (
                    <li className={`${pathname === "/variantes-productos" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                      <Link
                        href="/variantes-productos"
                        className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/variantes-productos" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                        prefetch={false}
                      >
                        <IconStack className="w-4 h-4" />
                        <span>Variantes de productos</span>
                      </Link>
                    </li>
                  )}
                  {isModuloPermitido('movimientos-stock') && (
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
                  )}
                  {isModuloPermitido('stock-faltante') && (
                    <li className={`${pathname === "/stock-faltante" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                      <Link
                        href="/stock-faltante"
                        className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/stock-faltante" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                        prefetch={false}
                      >
                        <IconStack className="w-4 h-4" />
                        <span>Stock Faltante</span>
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}
          {/* Menú Contactos desplegable */}
          {(isModuloPermitido('clientes') || isModuloPermitido('usuarios')) && (
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
                  {isModuloPermitido('clientes') && (
                    <li className={`${pathname === "/clientes" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                      <Link
                        href="/clientes"
                        className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/clientes" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                        prefetch={false}
                      >
                        <IconCalendar className="w-4 h-4" />
                        <span>Clientes/Proveedores</span>
                      </Link>
                    </li>
                  )}
                  {isModuloPermitido('usuarios') && (
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
                  )}
                </ul>
              )}
            </li>
          )}
          {/* Menú Seguridad desplegable - Solo para administradores */}
          {usuarioDB?.rol === "admin" && (
            <li>
              <button
                type="button"
                className={`flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full focus:outline-none ${isSeguridadActive ? "text-blue-600" : "text-gray-800"}`}
                onClick={() => setSeguridadOpen((v) => !v)}
              >
                <IconShield className={`w-5 h-5 ${isSeguridadActive ? "text-blue-600" : ""}`} />
                <span className="font-medium">Seguridad</span>
                <svg className={`ml-auto w-4 h-4 transition-transform ${seguridadOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {seguridadOpen && (
                <ul className="ml-8 mt-1 flex flex-col gap-1">
                  <li className={`${pathname === "/seguridad" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                    <Link
                      href="/seguridad"
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/seguridad" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                      prefetch={false}
                    >
                      <IconShield className="w-4 h-4" />
                      <span>Seguridad por Usuario</span>
                    </Link>
                  </li>
                  <li className={`${pathname === "/seguridad/modulos" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                    <Link
                      href="/seguridad/modulos"
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/seguridad/modulos" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                      prefetch={false}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Módulos</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          )}
          {/* Menú Ventas desplegable */}
          {(isModuloPermitido('ventas') || isModuloPermitido('cuentas-corrientes') || isModuloPermitido('pagos') || isModuloPermitido('mis-ventas')) && (
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
                  {isModuloPermitido('ventas') && (
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
                  )}
                  {isModuloPermitido('cuentas-corrientes') && (
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
                  )}
                  {isModuloPermitido('pagos') && (
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
                  )}
                  {isModuloPermitido('mis-ventas') && (
                    <li className={`${pathname === "/mis-ventas" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                      <Link
                        href="/mis-ventas"
                        className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/mis-ventas" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                        prefetch={false}
                      >
                        <IconReportAnalytics className="w-4 h-4" />
                        <span>Mis ventas</span>
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}
          {/* Menú Tesorería desplegable */}
          {(isModuloPermitido('caja') || isModuloPermitido('gastos-empleados')) && (
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
                  {isModuloPermitido('caja') && (
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
                  )}
                  {isModuloPermitido('gastos-empleados') && (
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
                  )}
                </ul>
              )}
            </li>
          )}
          {/* Menú Sueldos desplegable */}
          {(usuarioDB?.rol === "supervisor" || isModuloPermitido('empleados') || isModuloPermitido('liquidaciones')) && (
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
                  {isModuloPermitido('liquidaciones') && (
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
                  )}
                  {isModuloPermitido('empleados') && (
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
                  )}
                </ul>
              )}
            </li>
          )}

          {/* Menú Importaciones de datos */}
          {isModuloPermitido('importacion-stock') && (
            <li>
              <button
                type="button"
                className={`flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-100 transition-colors w-full focus:outline-none ${isImportacionesActive ? "text-blue-600" : "text-gray-800"}`}
                onClick={() => setImportacionesOpen((v) => !v)}
              >
                <IconUpload className={`w-5 h-5 ${isImportacionesActive ? "text-blue-600" : ""}`} />
                <span className="font-medium">Importaciones de datos</span>
                <svg className={`ml-auto w-4 h-4 transition-transform ${importacionesOpen ? "rotate-90" : "rotate-0"}`} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {importacionesOpen && (
                <ul className="ml-8 mt-1 flex flex-col gap-1">
                  <li className={`${pathname === "/importacion-stock" ? "border-l-4 border-blue-600 bg-blue-50" : ""} pl-2`}>
                    <Link
                      href="/importacion-stock"
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === "/importacion-stock" ? "text-blue-800 font-semibold" : "hover:bg-gray-100 text-black"}`}
                      prefetch={false}
                    >
                      <IconUpload className="w-4 h-4" />
                      <span>Importar Stock</span>
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
        <span className="text-[10px] text-gray-400 mt-1">Versión 1.3</span>
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

