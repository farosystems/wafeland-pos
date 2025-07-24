"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getClientes } from "@/services/clientes";
import { getUsuarios } from "@/services/usuarios";
import { getTiposComprobantes } from "@/services/tiposComprobantes";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { getArticles } from "@/services/articles";
import { createOrdenVenta } from "@/services/ordenesVenta";
import { createOrdenVentaDetalle } from "@/services/ordenesVentaDetalle";
import { createOrdenVentaMediosPago } from "@/services/ordenesVentaMediosPago";
import { getLoteCajaAbiertaPorUsuario } from "@/services/lotesOperaciones";
import { getOrdenesVentaDetalle } from "@/services/ordenesVentaDetalle";
import { updateOrdenVenta } from "@/services/ordenesVenta";
import { registrarMovimientoCaja } from "@/services/detalleLotesOperaciones";
import { Cliente } from "@/types/cliente";
import { Usuario } from "@/types/usuario";
import { TipoComprobante } from "@/types/tipoComprobante";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import { Article } from "@/types/article";
import { OrdenVenta, OrdenVentaDetalle } from "@/types/ordenVenta";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/utils";
import { useTrialCheck } from "@/hooks/use-trial-check";
import { createMovimientoStock } from "@/services/movimientosStock";

interface NotaCreditoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotaCreditoGuardada?: () => void;
  ventaAAnular: OrdenVenta | null;
}

interface DetalleLinea {
  articulo: Article | null;
  cantidad: number;
  precio: number;
  subtotal: number;
  input: string;
}

export function NotaCreditoDialog({ open, onOpenChange, onNotaCreditoGuardada, ventaAAnular }: NotaCreditoDialogProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tiposComprobantes, setTiposComprobantes] = useState<TipoComprobante[]>([]);
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);
  const [articulos, setArticulos] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalleOriginal, setDetalleOriginal] = useState<OrdenVentaDetalle[]>([]);
  const { checkTrial } = useTrialCheck();
  const [showTrialEnded, setShowTrialEnded] = useState(false);

  useEffect(() => {
    if (open && ventaAAnular) {
      setLoading(true);
      Promise.all([
        getClientes(),
        getUsuarios(),
        getTiposComprobantes(),
        getCuentasTesoreria(),
        getArticles(),
        getOrdenesVentaDetalle(ventaAAnular.id),
      ]).then(([c, u, tc, ct, a, detalle]) => {
        setClientes(c);
        setUsuarios(u);
        setTiposComprobantes(tc);
        setCuentasTesoreria(ct);
        setArticulos(a);
        setDetalleOriginal(detalle);
        setLoading(false);
      });
    }
  }, [open, ventaAAnular]);

  const [tab, setTab] = useState("cabecera");
  const [detalle, setDetalle] = useState<DetalleLinea[]>([]);
  const [showSugerencias, setShowSugerencias] = useState<number | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Cargar detalle de la venta original cuando se abre el diálogo
  useEffect(() => {
    if (open && ventaAAnular && detalleOriginal.length > 0 && articulos.length > 0) {
      const detalleCargado = detalleOriginal.map(d => {
        const articulo = articulos.find(a => a.id === d.fk_id_articulo);
        return {
          articulo: articulo || null,
          cantidad: d.cantidad,
          precio: d.precio_unitario,
          subtotal: d.cantidad * d.precio_unitario,
          input: articulo?.descripcion || "",
        };
      });
      setDetalle(detalleCargado);
    }
  }, [open, ventaAAnular, detalleOriginal, articulos]);

  useEffect(() => {
    if (!open) {
      setDetalle([]);
      setShowSugerencias(null);
    }
  }, [open]);

  const articulosActivos = useMemo(() => articulos.filter(a => a.activo), [articulos]);
  const cuentasTesoreriaValidas = cuentasTesoreria.filter(c => c.activo && c.descripcion && c.descripcion.trim() !== "");
  const total = detalle.reduce((acc, d) => acc + (d.cantidad && d.precio ? d.cantidad * d.precio : 0), 0);

  function handleDetalleChange(idx: number, field: string, value: string | number) {
    setDetalle(detalle => {
      const nuevo = [...detalle];
      if (field === "articulo") {
        const art = articulosActivos.find(a => a.id === Number(value));
        nuevo[idx].articulo = art || null;
        nuevo[idx].precio = art ? art.precio_unitario : 0;
        nuevo[idx].input = art ? art.descripcion : "";
        if (!nuevo[idx].cantidad || isNaN(nuevo[idx].cantidad) || nuevo[idx].cantidad <= 0) {
          nuevo[idx].cantidad = 1;
        }
        setShowSugerencias(null);
      } else if (field === "cantidad") {
        nuevo[idx].cantidad = Math.max(1, Number(value));
      } else if (field === "precio") {
        nuevo[idx].precio = Math.max(0, Number(value));
      } else if (field === "input") {
        nuevo[idx].input = String(value);
        setShowSugerencias(idx);
      }
      nuevo[idx].subtotal = nuevo[idx].cantidad * nuevo[idx].precio;
      return nuevo;
    });
  }

  function getSugerencias(input: string) {
    if (!input) return [];
    return articulosActivos.filter(a =>
      a.descripcion.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 8);
  }

  function agregarLinea() {
    setDetalle(detalle => [...detalle, { articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "" }]);
    setTimeout(() => {
      const idx = detalle.length;
      if (inputRefs.current[idx]) inputRefs.current[idx]?.focus();
    }, 0);
  }

  function quitarLinea(idx: number) {
    setDetalle(detalle => detalle.length > 1 ? detalle.filter((_, i) => i !== idx) : detalle);
  }

  const [mediosPago, setMediosPago] = useState<{ cuenta: CuentaTesoreria | null; monto: number }[]>([
    { cuenta: null, monto: 0 },
  ]);

  const sumaMediosPago = mediosPago.reduce((acc, m) => acc + (m.monto || 0), 0);
  const diferenciaMediosPago = sumaMediosPago - total;
  const mediosPagoIncompletos = diferenciaMediosPago !== 0;

  const cuentasSeleccionadas = mediosPago
    .filter(m => m.cuenta)
    .map(m => m.cuenta!.id);
  const cuentasDuplicadas = cuentasSeleccionadas.length !== new Set(cuentasSeleccionadas).size;
  const hayCuentasDuplicadas = cuentasDuplicadas;

  const [primerMontoEditado, setPrimerMontoEditado] = useState(false);

  useEffect(() => {
    if (!primerMontoEditado && mediosPago.length > 0) {
      setMediosPago((prev) => [{ ...prev[0], monto: total }, ...prev.slice(1)]);
    }
  }, [total, mediosPago.length, primerMontoEditado]);

  useEffect(() => {
    if (!open) {
      setMediosPago([{ cuenta: null, monto: 0 }]);
      setPrimerMontoEditado(false);
    }
  }, [open]);

  function handleMontoChange(idx: number, value: number) {
    setMediosPago((prev) => {
      const nuevo = [...prev];
      nuevo[idx].monto = value;
      return nuevo;
    });
    if (idx === 0) setPrimerMontoEditado(true);
  }

  function agregarMedioPago() {
    setMediosPago((prev) => [...prev, { cuenta: null, monto: 0 }]);
  }

  function quitarMedioPago(idx: number) {
    setMediosPago((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
    if (idx === 0) setPrimerMontoEditado(false);
  }

  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);
  const [loteAbierto, setLoteAbierto] = useState<number | null>(null);

  // Cargar datos de la venta original
  useEffect(() => {
    if (ventaAAnular) {
      setClienteSeleccionado(ventaAAnular.fk_id_entidades);
      setUsuarioSeleccionado(ventaAAnular.fk_id_usuario);
    }
  }, [ventaAAnular]);

  useEffect(() => {
    async function fetchLoteAbierto() {
      if (usuarioSeleccionado) {
        const lote = await getLoteCajaAbiertaPorUsuario(usuarioSeleccionado);
        setLoteAbierto(lote ? lote.id_lote : 0);
      } else {
        setLoteAbierto(0);
      }
    }
    if (open) {
      fetchLoteAbierto();
    }
  }, [open, usuarioSeleccionado]);

  const [error, setError] = useState<string | null>(null);
  const [showLoteError, setShowLoteError] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: "" });
  const [showMediosPagoError, setShowMediosPagoError] = useState(false);

  function showToast(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  }

  async function handleGuardarNotaCredito() {
    setLoading(true);
    setError(null);
    const expired = await checkTrial(() => setShowTrialEnded(true));
    if (expired) {
      setLoading(false);
      return;
    }
    try {
      if (!clienteSeleccionado || !usuarioSeleccionado || !loteAbierto || loteAbierto === 0) {
        setShowLoteError(true);
        setLoading(false);
        return;
      }
      // Validar que haya al menos un medio de pago
      if (!mediosPago || mediosPago.length === 0 || mediosPago.every(m => !m.cuenta || m.monto <= 0)) {
        setShowMediosPagoError(true);
        setLoading(false);
        return;
      }
      const totalNotaCredito = detalle.reduce((acc, d) => acc + (d.cantidad && d.precio ? d.cantidad * d.precio : 0), 0);
      const hoy = format(new Date(), "yyyy-MM-dd");

      // Crear la nota de crédito (total negativo)
      const notaCredito = await createOrdenVenta({
        fk_id_entidades: clienteSeleccionado,
        fk_id_usuario: usuarioSeleccionado,
        fk_id_lote: loteAbierto,
        fk_id_tipo_comprobante: 2, // NOTA DE CREDITO
        fecha: hoy,
        total: -totalNotaCredito, // Total negativo
        subtotal: -totalNotaCredito, // Subtotal negativo
        fk_id_orden_anulada: ventaAAnular?.id,
      });

      // Crear los detalles de artículos
      for (const d of detalle) {
        if (d.articulo && d.cantidad > 0) {
          await createOrdenVentaDetalle({
            fk_id_orden: notaCredito.id,
            fk_id_articulo: d.articulo.id,
            cantidad: d.cantidad,
            precio_unitario: d.precio,
          });

          // Registrar movimiento de stock (NOTA DE CREDITO)
          await createMovimientoStock({
            fk_id_orden: notaCredito.id,
            fk_id_articulos: d.articulo.id,
            origen: "NOTA DE CREDITO",
            tipo: "entrada",
            cantidad: Math.abs(d.cantidad),
          });
        }
      }

      // Crear los medios de pago (para la devolución)
      for (const m of mediosPago) {
        if (m.cuenta && m.monto > 0) {
          await createOrdenVentaMediosPago({
            fk_id_orden: notaCredito.id,
            fk_id_cuenta_tesoreria: m.cuenta.id,
            monto_pagado: m.monto,
          });
          // Registrar egreso en caja
          await registrarMovimientoCaja({
            fk_id_lote: loteAbierto!,
            fk_id_cuenta_tesoreria: m.cuenta.id,
            tipo: "egreso",
            monto: m.monto,
          });
        }
      }
      if (!ventaAAnular) return;
      await updateOrdenVenta(ventaAAnular.id, { anulada: true });

      if (onNotaCreditoGuardada) onNotaCreditoGuardada();
      onOpenChange(false);
      showToast("Nota de crédito registrada con éxito");
    } catch (e: any) {
      console.error("Error al guardar la nota de crédito:", e);
      setError(e?.message || e?.error_description || "Error al guardar la nota de crédito");
    }
    setLoading(false);
  }

  if (!ventaAAnular) return null;

  const cliente = clientes.find(c => c.id === ventaAAnular.fk_id_entidades);
  const usuario = usuarios.find(u => u.id === ventaAAnular.fk_id_usuario);
  const tipoComp = tiposComprobantes.find(tc => tc.id === ventaAAnular.fk_id_tipo_comprobante);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" preventOutsideClose>
          <DialogHeader>
            <DialogTitle>Nota de Crédito - Anular Venta N° {ventaAAnular.id}</DialogTitle>
            <DialogDescription>
              Genera una nota de crédito para anular la venta seleccionada. Los artículos se reingresarán al stock.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="text-center py-8">Cargando datos...</div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="mt-2">
              <TabsList>
                <TabsTrigger value="cabecera">Cabecera</TabsTrigger>
                <TabsTrigger value="detalle">Detalle</TabsTrigger>
                <TabsTrigger value="medios">Medios de cobro</TabsTrigger>
                <TabsTrigger value="verificacion">Verificación</TabsTrigger>
              </TabsList>

              <TabsContent value="cabecera">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium">Cliente</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">
                      {cliente?.razon_social || ventaAAnular.fk_id_entidades}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Usuario</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">
                      {usuario?.nombre || ventaAAnular.fk_id_usuario}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Tipo de comprobante</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">
                      NOTA DE CREDITO
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Fecha</label>
                    <input type="date" className="w-full border rounded px-2 py-1" value={format(new Date(), "yyyy-MM-dd")}
                      readOnly disabled />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Venta original</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">
                      N° {ventaAAnular.id} - {tipoComp?.descripcion || ventaAAnular.fk_id_tipo_comprobante}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Total a devolver</label>
                    <div className="border rounded px-2 py-1 bg-gray-50 font-bold text-red-600">
                      {formatCurrency(total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}
                    </div>
                  </div>
                </div>
                {error && <div className="text-red-600 mt-2">{error}</div>}
              </TabsContent>

              <TabsContent value="detalle">
                <div className="mb-2">Artículos de la venta original (puedes modificar cantidades):</div>
                <table className="min-w-full text-sm border mb-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1">Artículo</th>
                      <th className="px-2 py-1">Cantidad</th>
                      <th className="px-2 py-1">Precio</th>
                      <th className="px-2 py-1">Subtotal</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.map((d, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full border rounded px-2 py-1"
                              placeholder="Buscar artículo..."
                              value={d.input}
                              onChange={e => handleDetalleChange(idx, "input", e.target.value)}
                              autoComplete="off"
                              ref={el => { inputRefs.current[idx] = el; }}
                              onFocus={() => d.input && setShowSugerencias(idx)}
                              onBlur={() => setTimeout(() => setShowSugerencias(s => (s === idx ? null : s)), 120)}
                            />
                            {d.input && showSugerencias === idx && getSugerencias(d.input).length > 0 && (
                              <div className="absolute z-10 bg-white border rounded shadow w-full max-h-40 overflow-auto">
                                {getSugerencias(d.input).map(a => (
                                  <div
                                    key={a.id}
                                    className="px-2 py-1 hover:bg-gray-100 cursor-pointer flex justify-between"
                                    onClick={() => handleDetalleChange(idx, "articulo", a.id)}
                                  >
                                    <span>{a.descripcion}</span>
                                    <span className="text-xs text-muted-foreground">${a.precio_unitario}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="1"
                            className={cn(
                              "w-20 border rounded px-2 py-1 text-right",
                              !d.cantidad || isNaN(d.cantidad) || Number(d.cantidad) <= 0 ? "border-red-500 bg-red-50" : ""
                            )}
                            value={d.cantidad === 0 ? "" : d.cantidad}
                            onChange={e => handleDetalleChange(idx, "cantidad", e.target.value === "" ? "" : Number(e.target.value))}
                            placeholder="Cantidad"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min={0}
                            className="w-24 border rounded px-2 py-1"
                            value={d.precio}
                            onChange={e => handleDetalleChange(idx, "precio", e.target.value)}
                            disabled={!d.articulo}
                          />
                        </td>
                        <td className="px-2 py-1">${(d.subtotal || 0).toFixed(2)}</td>
                        <td className="px-2 py-1">
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => quitarLinea(idx)}
                            disabled={detalle.length === 1}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between items-center">
                  <button className="text-blue-600 hover:underline" onClick={agregarLinea}>+ Agregar línea</button>
                  <div className="font-bold text-red-600">Total a devolver: {formatCurrency(total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</div>
                </div>
              </TabsContent>

              <TabsContent value="medios">
                <div className="mb-2">Selecciona cuentas de tesorería y montos a devolver:</div>
                <table className="min-w-full text-sm mb-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1 text-left">Cuenta Tesorería</th>
                      <th className="px-2 py-1 text-left">Monto a devolver</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediosPago.map((m, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">
                          <select
                            className="w-full border rounded px-2 py-1"
                            value={m.cuenta?.id || ""}
                            onChange={e => {
                              const cuenta = cuentasTesoreriaValidas.find(c => c.id === Number(e.target.value)) || null;
                              setMediosPago((prev) => prev.map((mp, i) => i === idx ? { ...mp, cuenta } : mp));
                            }}
                          >
                            <option value="">Seleccionar cuenta</option>
                            {cuentasTesoreriaValidas.map((c) => (
                              <option key={c.id} value={c.id}>{c.descripcion}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            className="w-32 border rounded px-2 py-1 text-right"
                            value={m.monto === 0 ? "" : m.monto}
                            onChange={e => handleMontoChange(idx, Number(e.target.value))}
                            placeholder="Monto"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Button size="sm" variant="destructive" onClick={() => quitarMedioPago(idx)} disabled={mediosPago.length === 1}>Quitar</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button size="sm" variant="outline" onClick={agregarMedioPago}>Agregar medio de cobro</Button>
                
                {mediosPagoIncompletos && (
                  <div className="text-red-600 text-xs mt-1">
                    La suma de los montos de devolución debe ser igual al total de la nota de crédito ({formatCurrency(total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}). Diferencia: {diferenciaMediosPago > 0 ? "+" : ""}{diferenciaMediosPago.toFixed(2)}
                  </div>
                )}
                {hayCuentasDuplicadas && (
                  <div className="text-red-600 text-xs mt-1">
                    Hay cuentas de tesorería duplicadas en los medios de cobro. Por favor, corrige.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="verificacion">
                <div className="mb-2 font-bold">Verificación final de la nota de crédito</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-1 font-medium">Cliente</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">{cliente?.razon_social || "-"}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Usuario</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">{usuario?.nombre || "-"}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Tipo de comprobante</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">NOTA DE CREDITO</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Fecha</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">{format(new Date(), "yyyy-MM-dd")}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Venta original</label>
                    <div className="border rounded px-2 py-1 bg-gray-50">N° {ventaAAnular.id}</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Total a devolver</label>
                    <div className="border rounded px-2 py-1 bg-gray-50 font-bold text-red-600">${formatCurrency(total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="font-semibold text-sm mb-2">Artículos a reingresar ({detalle.filter(d => d.articulo && d.cantidad > 0).length}):</div>
                  <div className="border rounded p-2 bg-gray-50 max-h-32 overflow-y-auto">
                    {detalle.filter(d => d.articulo && d.cantidad > 0).map((d, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span>{d.articulo?.descripcion}</span>
                        <span>{d.cantidad} x ${d.precio.toFixed(2)} = ${d.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                    {detalle.filter(d => d.articulo && d.cantidad > 0).length === 0 && (
                      <div className="text-gray-500 text-sm">No hay artículos para reingresar</div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="font-semibold text-sm mb-2">Medios de cobro ({mediosPago.filter(m => m.cuenta && m.monto > 0).length}):</div>
                  <div className="border rounded p-2 bg-gray-50">
                    {mediosPago.filter(m => m.cuenta && m.monto > 0).map((m, idx) => (
                      <div key={idx} className="flex justify-between text-sm py-1">
                        <span>{m.cuenta?.descripcion}</span>
                        <span>${m.monto.toFixed(2)}</span>
                      </div>
                    ))}
                    {mediosPago.filter(m => m.cuenta && m.monto > 0).length === 0 && (
                      <div className="text-gray-500 text-sm">No hay medios de cobro configurados</div>
                    )}
                    {mediosPago.filter(m => m.cuenta && m.monto > 0).length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Total medios de cobro:</span>
                          <span>${sumaMediosPago.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total a devolver:</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between text-sm ${diferenciaMediosPago === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>Diferencia:</span>
                          <span>{diferenciaMediosPago > 0 ? '+' : ''}{diferenciaMediosPago.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={handleGuardarNotaCredito}
              disabled={loading || !detalle.some(linea => linea.cantidad > 0) || detalle.some(linea => !linea.cantidad || isNaN(linea.cantidad) || Number(linea.cantidad) <= 0) || mediosPagoIncompletos || hayCuentasDuplicadas}
              className="bg-red-600 hover:bg-red-700"
            >
              Generar Nota de Crédito
            </Button>
            {detalle.some(linea => !linea.cantidad || isNaN(linea.cantidad) || Number(linea.cantidad) <= 0) && (
              <div className="text-red-600 text-xs mt-1">Todas las líneas deben tener una cantidad válida mayor a 0.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showLoteError} onOpenChange={setShowLoteError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Caja cerrada</DialogTitle>
            <DialogDescription>
              Debe haber una caja abierta para registrar la nota de crédito. Por favor, abra la caja antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowLoteError(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-lg animate-fade-in">
          {toast.message}
        </div>
      )}
      {/* Modal de error de medios de pago */}
      <Dialog open={showMediosPagoError} onOpenChange={setShowMediosPagoError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error en medios de pago</DialogTitle>
          </DialogHeader>
          <div className="text-red-600 mb-4">Debes agregar al menos un detalle de cuenta de tesorería y monto válido para la devolución.</div>
          <div className="flex justify-end">
            <Button onClick={() => setShowMediosPagoError(false)}>Aceptar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showTrialEnded} onOpenChange={setShowTrialEnded}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prueba gratis finalizada</DialogTitle>
            <DialogDescription>
              La prueba gratis ha finalizado. Debe abonar para continuar usando el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowTrialEnded(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 