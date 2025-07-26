"use client";
import { useUser } from "@clerk/nextjs";
import React, { useEffect, useState, useMemo } from "react";
import { getMovimientosStock } from "@/services/movimientosStock";
import { MovimientoStock } from "@/types/movimientoStock";
import { getArticles } from "@/services/articles";
import { Article } from "@/types/article";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Package, Eye, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getOrdenesVenta } from "@/services/ordenesVenta";
import { getOrdenesVentaDetalle } from "@/services/ordenesVentaDetalle";
import { getOrdenesVentaMediosPago } from "@/services/ordenesVentaMediosPago";
// Para mostrar nombres de cliente, usuario y cuenta
import { getClientes } from "@/services/clientes";
import { getUsuarios } from "@/services/usuarios";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { Cliente } from "@/types/cliente";
import { Usuario } from "@/types/usuario";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { useRouter } from "next/navigation";

type OrdenDetalleType = {
  cabecera: {
    id: number;
    fecha: string;
    fk_id_entidades: number | null;
    fk_id_usuario: number;
    total: number;
    subtotal: number;
    fk_id_tipo_comprobante: number;
    fk_id_lote: number;
  };
  detalles: Array<{
    fk_id_articulo: number;
    cantidad: number;
    precio_unitario: number;
  }>;
  pagos: Array<{
    fk_id_cuenta_tesoreria: number;
    monto_pagado: number;
  }>;
};

export default function MovimientosStockPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([]);
  const [articulos, setArticulos] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const MOVS_POR_PAGINA = 10;

  // Estados para popups
  const [showMovimiento, setShowMovimiento] = useState<null | MovimientoStock>(null);
  const [showOrden, setShowOrden] = useState<null | number>(null);
  const [ordenDetalle, setOrdenDetalle] = useState<OrdenDetalleType | null>(null);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [movs, arts] = await Promise.all([
          getMovimientosStock(),
          getArticles(),
        ]);
        setMovimientos(movs);
        setArticulos(arts);
      } catch (err: any) {
        setError(err.message || "Error al cargar movimientos de stock");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    getClientes().then(setClientes);
    getUsuarios().then(setUsuarios);
    getCuentasTesoreria().then(setCuentasTesoreria);
  }, []);

  const getArticuloNombre = (id: number | null) => {
    if (id === null) return 'Sin artículo';
    const art = articulos.find(a => a.id === id);
    return art ? art.descripcion : id;
  };

  const movimientosFiltrados = useMemo(() => {
    if (!filtro.trim()) return movimientos;
    const filtroLower = filtro.toLowerCase();
    return movimientos.filter(mov =>
      mov.id.toString().includes(filtroLower) ||
      String(getArticuloNombre(mov.fk_id_articulos)).toLowerCase().includes(filtroLower) ||
      (mov.origen?.toLowerCase().includes(filtroLower) || false) ||
      (Array.isArray(mov.tipo) ? mov.tipo.join(",").toLowerCase().includes(filtroLower) : String(mov.tipo).toLowerCase().includes(filtroLower)) ||
      (mov.cantidad?.toString() || '0').includes(filtroLower) ||
      (mov.creado_el?.toLowerCase().includes(filtroLower) || false)
    );
  }, [movimientos, filtro, articulos]);

  const movimientosPagina = useMemo(() => {
    const totalPaginas = Math.ceil(movimientosFiltrados.length / MOVS_POR_PAGINA);
    const paginaValida = Math.min(paginaActual, totalPaginas);
    if (paginaValida !== paginaActual && totalPaginas > 0) {
      setPaginaActual(paginaValida);
    }
    return movimientosFiltrados.slice((paginaValida - 1) * MOVS_POR_PAGINA, paginaValida * MOVS_POR_PAGINA);
  }, [movimientosFiltrados, paginaActual]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(movimientosFiltrados.length / MOVS_POR_PAGINA);
  }, [movimientosFiltrados]);

  // Handler para abrir popup de orden
  const handleOpenOrden = async (id: number) => {
    setShowOrden(id);
    // Cargar cabecera, detalles y pagos
    const cabecera = await getOrdenesVenta().then(ordenes => ordenes.find(o => o.id === id));
    const detalles = await getOrdenesVentaDetalle(id) || [];
    const pagos = await getOrdenesVentaMediosPago(id) || [];
    setOrdenDetalle({
      cabecera: cabecera || {
        id: 0,
        fecha: '',
        fk_id_entidades: null,
        fk_id_usuario: 0,
        total: 0,
        subtotal: 0,
        fk_id_tipo_comprobante: 0,
        fk_id_lote: 0,
      },
      detalles,
      pagos,
    });
  };

  function getClienteNombre(id: number) {
    return clientes.find(c => c.id === id)?.razon_social || id;
  }
  function getUsuarioNombre(id: number) {
    return usuarios.find(u => u.id === id)?.nombre || id;
  }
  function getCuentaNombre(id: number) {
    return cuentasTesoreria.find(c => c.id === id)?.descripcion || id;
  }
  function formatMoney(val: number) {
    return val?.toLocaleString("es-AR", { style: "currency", currency: "ARS" }) || val;
  }

  // Columnas y visibilidad
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const columns = [
    { key: "id", label: "ID" },
    { key: "articulo", label: "Artículo" },
    { key: "talle_descripcion", label: "Talle" },
    { key: "color_descripcion", label: "Color" },
    { key: "origen", label: "Origen" },
    { key: "fk_id_orden", label: "Orden" },
    { key: "tipo", label: "Tipo" },
    { key: "cantidad", label: "Cantidad" },
    { key: "creado_el", label: "Fecha" },
    { key: "acciones", label: "Acciones" },
  ];

  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver los movimientos de stock.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full px-8 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando movimientos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <BreadcrumbBar />
      <div className="w-full px-8 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold leading-tight">Movimientos de Stock</span>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center py-4">
            <input
              type="text"
              placeholder="Buscar movimiento..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="border rounded px-3 py-2 flex-1 max-w-xs mr-2"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columnas <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {columns.map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    className="capitalize"
                    checked={columnVisibility[col.key] !== false}
                    onCheckedChange={val => setColumnVisibility(v => ({ ...v, [col.key]: !!val }))}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(col => (columnVisibility[col.key] ?? true) && (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientosPagina.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    {movimientos.length === 0 ? "No hay movimientos de stock registrados." : "No se encontraron movimientos con los filtros aplicados."}
                  </TableCell>
                </TableRow>
              ) : (
                movimientosPagina.map((mov) => (
                  <TableRow key={mov.id} className="border-b hover:bg-gray-50 transition-colors">
                    {(columnVisibility["id"] ?? true) && <TableCell>{mov.id}</TableCell>}
                    {(columnVisibility["articulo"] ?? true) && <TableCell>{getArticuloNombre(mov.fk_id_articulos)}</TableCell>}
                    {(columnVisibility["talle_descripcion"] ?? true) && <TableCell>{mov.talle_descripcion}</TableCell>}
                    {(columnVisibility["color_descripcion"] ?? true) && <TableCell>{mov.color_descripcion}</TableCell>}
                    {(columnVisibility["origen"] ?? true) && <TableCell>{mov.origen}</TableCell>}
                    {(columnVisibility["fk_id_orden"] ?? true) && <TableCell>
                      {mov.fk_id_orden ? (
                        <span
                          className="underline text-blue-600 cursor-pointer"
                          onClick={() => mov.fk_id_orden && handleOpenOrden(mov.fk_id_orden)}
                        >
                          {mov.fk_id_orden}
                        </span>
                      ) : "-"}
                    </TableCell>}
                    {(columnVisibility["tipo"] ?? true) && (
                      <TableCell>
                        {Array.isArray(mov.tipo)
                          ? mov.tipo.map((t, i) => (
                              <span key={i} className={
                                t === "entrada"
                                  ? "inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold mr-1"
                                  : t === "salida"
                                  ? "inline-block px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold mr-1"
                                  : "inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold mr-1"
                              }>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </span>
                            ))
                          : (
                              <span className={
                                mov.tipo === "entrada"
                                  ? "inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold"
                                  : mov.tipo === "salida"
                                  ? "inline-block px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold"
                                  : "inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold"
                              }>
                                {String(mov.tipo).charAt(0).toUpperCase() + String(mov.tipo).slice(1)}
                              </span>
                            )}
                      </TableCell>
                    )}
                    {(columnVisibility["cantidad"] ?? true) && <TableCell>{mov.cantidad}</TableCell>}
                    {(columnVisibility["creado_el"] ?? true) && <TableCell>{new Date(mov.creado_el).toLocaleString()}</TableCell>}
                    {(columnVisibility["acciones"] ?? true) && <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setShowMovimiento(mov)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {/* Paginación */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {movimientosFiltrados.length === 0 ? (
                "0 de 0 movimientos."
              ) : (
                `${(paginaActual - 1) * MOVS_POR_PAGINA + 1} - ${Math.min(paginaActual * MOVS_POR_PAGINA, movimientosFiltrados.length)} de ${movimientosFiltrados.length} movimiento(s).`
              )}
            </div>
            <div className="space-x-2">
              <button
                className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              <button
                className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
              >
                Siguiente
              </button>
            </div>
          </div>
          {/* Popups */}
          <Dialog open={!!showMovimiento} onOpenChange={() => setShowMovimiento(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalle del Movimiento de Stock</DialogTitle>
              </DialogHeader>
              {showMovimiento && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    <div><b>ID:</b></div>
                    <div>{showMovimiento.id}</div>
                    <div><b>Fecha:</b></div>
                    <div>{new Date(showMovimiento.creado_el).toLocaleString()}</div>
                    <div><b>Orden:</b></div>
                    <div>{showMovimiento.fk_id_orden ?? '-'}</div>
                    <div><b>Artículo:</b></div>
                    <div>{getArticuloNombre(showMovimiento.fk_id_articulos)}</div>
                    <div><b>Tipo:</b></div>
                    <div className={
                      (Array.isArray(showMovimiento.tipo) ? showMovimiento.tipo[0] : showMovimiento.tipo) === 'entrada'
                        ? 'text-green-700 font-semibold'
                        : 'text-red-700 font-semibold'
                    }>
                      {Array.isArray(showMovimiento.tipo) ? showMovimiento.tipo[0] : showMovimiento.tipo}
                    </div>
                    <div><b>Cantidad:</b></div>
                    <div className={(showMovimiento.cantidad ?? 0) > 0 ? 'text-green-700' : 'text-red-700'}>{showMovimiento.cantidad ?? 0}</div>
                    <div><b>Origen:</b></div>
                    <div>{showMovimiento.origen}</div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={!!showOrden} onOpenChange={() => { setShowOrden(null); setOrdenDetalle(null); }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Detalle de la Orden</DialogTitle>
              </DialogHeader>
              {ordenDetalle ? (
                <>
                  <div className="mb-4 pb-2 border-b">
                    <div className="font-semibold text-lg mb-2">Cabecera</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <div><b>N° Orden:</b> {ordenDetalle.cabecera.id}</div>
                      <div><b>Fecha:</b> {new Date(ordenDetalle.cabecera.fecha).toLocaleDateString()}</div>
                      <div><b>Cliente:</b> {getClienteNombre(ordenDetalle.cabecera.fk_id_entidades || 0)}</div>
                      <div><b>Usuario:</b> {getUsuarioNombre(ordenDetalle.cabecera.fk_id_usuario)}</div>
                      <div><b>Total:</b> <span className="font-bold text-green-700">{formatMoney(ordenDetalle.cabecera.total)}</span></div>
                      <div><b>Subtotal:</b> {formatMoney(ordenDetalle.cabecera.subtotal)}</div>
                      <div><b>Tipo Comprobante:</b> {ordenDetalle.cabecera.fk_id_tipo_comprobante}</div>
                      <div><b>Lote:</b> {ordenDetalle.cabecera.fk_id_lote}</div>
                    </div>
                  </div>
                  <div className="mb-4 pb-2 border-b">
                    <div className="font-semibold text-lg mb-2">Detalles de Artículos</div>
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left">Artículo</th>
                          <th className="px-2 py-1 text-right">Cantidad</th>
                          <th className="px-2 py-1 text-right">Precio Unitario</th>
                          <th className="px-2 py-1 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenDetalle.detalles?.map((d: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-2 py-1">{getArticuloNombre(d.fk_id_articulo)}</td>
                            <td className="px-2 py-1 text-right">{d.cantidad}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(d.precio_unitario)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(d.cantidad * d.precio_unitario)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="font-semibold text-lg mb-2">Pagos</div>
                    <table className="min-w-full text-sm border">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left">Cuenta Tesorería</th>
                          <th className="px-2 py-1 text-right">Monto Pagado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenDetalle.pagos?.map((p: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-2 py-1">{getCuentaNombre(p.fk_id_cuenta_tesoreria)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(p.monto_pagado)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <div>Cargando...</div>}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
} 