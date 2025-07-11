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
import { createOrdenVentaImpuestos } from "@/services/ordenesVentaImpuestos";
import { getLoteCajaAbiertaPorUsuario } from "@/services/lotesOperaciones";
import { Cliente } from "@/types/cliente";
import { Usuario } from "@/types/usuario";
import { TipoComprobante } from "@/types/tipoComprobante";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import { Article } from "@/types/article";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { updateArticle } from "@/services/articles";

interface VentaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVentaGuardada?: () => void; // Callback para refrescar la tabla de ventas
  // Opcional: venta a editar
}

// Cambiar la definición de detalle para tipar correctamente
interface DetalleLinea {
  articulo: Article | null;
  cantidad: number;
  precio: number;
  subtotal: number;
  input: string;
}

export function VentaFormDialog({ open, onOpenChange, onVentaGuardada }: VentaFormDialogProps) {
  // const { user } = useUser();
  // Datos para selects
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tiposComprobantes, setTiposComprobantes] = useState<TipoComprobante[]>([]);
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);
  const [articulos, setArticulos] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([
        getClientes(),
        getUsuarios(),
        getTiposComprobantes(),
        getCuentasTesoreria(),
        getArticles(),
      ]).then(([c, u, tc, ct, a]) => {
        setClientes(c);
        setUsuarios(u);
        setTiposComprobantes(tc);
        setCuentasTesoreria(ct);
        setArticulos(a);
        setLoading(false);
      });
    }
  }, [open]);

  // Estado de tabs y formulario (simplificado, estructura)
  const [tab, setTab] = useState("cabecera");

  // Estado para el detalle de la venta
  const [detalle, setDetalle] = useState<DetalleLinea[]>([
    { articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "" },
  ]);
  const [showSugerencias, setShowSugerencias] = useState<number | null>(null); // idx de línea con sugerencias abiertas
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Limpiar el detalle cuando se cierra el popup
  useEffect(() => {
    if (!open) {
      setDetalle([{ articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "" }]);
      setShowSugerencias(null);
    }
  }, [open]);

  // Filtrar solo artículos activos
  const articulosActivos = useMemo(() => articulos.filter(a => a.activo), [articulos]);

  // Filtrar solo cuentas de tesorería activas
  const cuentasTesoreriaValidas = cuentasTesoreria.filter(c => c.activo && c.descripcion && c.descripcion.trim() !== "");

  // Filtrar solo tipos de comprobante activos
  const tiposComprobantesValidos = tiposComprobantes.filter(tc => tc.activo && tc.descripcion && tc.descripcion.trim() !== "");

  // Calcular total
  const total = detalle.reduce((acc, d) => acc + (d.cantidad && d.precio ? d.cantidad * d.precio : 0), 0);

  // Función para manejar cambios en el detalle
  function handleDetalleChange(idx: number, field: string, value: string | number) {
    setDetalle(detalle => {
      const nuevo = [...detalle];
      if (field === "articulo") {
        const art = articulosActivos.find(a => a.id === Number(value));
        nuevo[idx].articulo = art || null;
        nuevo[idx].precio = art ? art.precio_unitario : 0;
        nuevo[idx].input = art ? art.descripcion : "";
        // Solo poner cantidad en 1 si está vacía o no es válida
        if (!nuevo[idx].cantidad || isNaN(nuevo[idx].cantidad) || nuevo[idx].cantidad <= 0) {
          nuevo[idx].cantidad = 1;
        }
        setShowSugerencias(null); // Cerrar sugerencias al seleccionar
      } else if (field === "cantidad") {
        nuevo[idx].cantidad = Math.max(1, Number(value));
      } else if (field === "precio") {
        nuevo[idx].precio = Math.max(0, Number(value));
      } else if (field === "input") {
        nuevo[idx].input = String(value);
        setShowSugerencias(idx); // Abrir sugerencias al escribir
      }
      nuevo[idx].subtotal = nuevo[idx].cantidad * nuevo[idx].precio;
      return nuevo;
    });
  }

  // Autocompletado: sugerencias por input
  function getSugerencias(input: string) {
    if (!input) return [];
    return articulosActivos.filter(a =>
      a.descripcion.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 8);
  }

  // Agregar línea
  function agregarLinea() {
    setDetalle(detalle => [...detalle, { articulo: null, cantidad: 1, precio: 0, subtotal: 0, input: "" }]);
    setTimeout(() => {
      const idx = detalle.length;
      if (inputRefs.current[idx]) inputRefs.current[idx]?.focus();
    }, 0);
  }
  // Quitar línea
  function quitarLinea(idx: number) {
    setDetalle(detalle => detalle.length > 1 ? detalle.filter((_, i) => i !== idx) : detalle);
  }

  // Estado para el detalle de medios de pago
  const [mediosPago, setMediosPago] = useState<{ cuenta: CuentaTesoreria | null; monto: number }[]>([
    { cuenta: null, monto: 0 },
  ]);

  // Calcular suma de medios de pago
  const sumaMediosPago = mediosPago.reduce((acc, m) => acc + (m.monto || 0), 0);
  const diferenciaMediosPago = sumaMediosPago - total;
  const mediosPagoIncompletos = diferenciaMediosPago !== 0;

  // Validar cuentas duplicadas
  const cuentasSeleccionadas = mediosPago
    .filter(m => m.cuenta)
    .map(m => m.cuenta!.id);
  const cuentasDuplicadas = cuentasSeleccionadas.length !== new Set(cuentasSeleccionadas).size;
  const hayCuentasDuplicadas = cuentasDuplicadas;

  // Estado para saber si el usuario modificó manualmente el monto del primer medio de pago
  const [primerMontoEditado, setPrimerMontoEditado] = useState(false);

  // Cuando cambia el total y hay al menos un medio de pago, autorellenar el primer monto si no fue editado manualmente
  useEffect(() => {
    if (!primerMontoEditado && mediosPago.length > 0) {
      setMediosPago((prev) => [{ ...prev[0], monto: total }, ...prev.slice(1)]);
    }
  }, [total, mediosPago.length, primerMontoEditado]);

  // Limpiar el detalle de medios de pago cuando se cierra el popup
  useEffect(() => {
    if (!open) {
      setMediosPago([{ cuenta: null, monto: 0 }]);
      setPrimerMontoEditado(false);
    }
  }, [open]);

  // Handler para cambio de monto
  function handleMontoChange(idx: number, value: number) {
    setMediosPago((prev) => {
      const nuevo = [...prev];
      nuevo[idx].monto = value;
      return nuevo;
    });
    if (idx === 0) setPrimerMontoEditado(true);
  }

  // Handler para agregar/quitar medios de pago
  function agregarMedioPago() {
    setMediosPago((prev) => [...prev, { cuenta: null, monto: 0 }]);
  }
  function quitarMedioPago(idx: number) {
    setMediosPago((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
    if (idx === 0) setPrimerMontoEditado(false);
  }

  // Estados para selects principales
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);
  const [tipoComprobanteSeleccionado, setTipoComprobanteSeleccionado] = useState<number | null>(null);
  const [loteAbierto, setLoteAbierto] = useState<number | null>(null); // Debe obtenerse del contexto o consulta

  // En el form principal (cabecera), los selects deben actualizar estos estados
  // Ejemplo:
  // <select value={clienteSeleccionado ?? ""} onChange={e => setClienteSeleccionado(Number(e.target.value) || null)}>
  // ...
  // <select value={usuarioSeleccionado ?? ""} onChange={e => setUsuarioSeleccionado(Number(e.target.value) || null)}>
  // ...
  // <select value={tipoComprobanteSeleccionado ?? ""} onChange={e => setTipoComprobanteSeleccionado(Number(e.target.value) || null)}>
  // ...
  // El lote abierto puede obtenerse de un hook/useEffect al abrir el modal

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

  // Estado para error
  const [error, setError] = useState<string | null>(null);
  const [showLoteError, setShowLoteError] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: "" });
  function showToast(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  }

  // En handleGuardarVenta:
  async function handleGuardarVenta() {
    setLoading(true);
    setError(null);
    try {
      // Validar selects y lote
      if (!clienteSeleccionado || !usuarioSeleccionado || !tipoComprobanteSeleccionado || !loteAbierto || loteAbierto === 0) {
        setShowLoteError(true);
        setLoading(false);
        return;
      }
      // Calcular total y subtotal de la venta
      const totalVenta = detalle.reduce((acc, d) => acc + (d.cantidad && d.precio ? d.cantidad * d.precio : 0), 0);
      // 1. Crear la orden de venta principal
      const hoy = format(new Date(), "yyyy-MM-dd");
      const ordenVenta = await createOrdenVenta({
        fk_id_entidades: clienteSeleccionado,
        fk_id_usuario: usuarioSeleccionado,
        fk_id_lote: loteAbierto,
        fk_id_tipo_comprobante: tipoComprobanteSeleccionado,
        fecha: hoy,
        total: totalVenta,
        subtotal: totalVenta,
      });
      // 2. Crear los detalles de artículos
      for (const d of detalle) {
        if (d.articulo && d.cantidad > 0) {
          await createOrdenVentaDetalle({
            fk_id_orden: ordenVenta.id,
            fk_id_articulo: d.articulo.id,
            cantidad: d.cantidad,
            precio_unitario: d.precio,
          });
          // Descontar stock
          if (typeof d.articulo.stock === 'number') {
            const nuevoStock = Math.max(0, d.articulo.stock - d.cantidad);
            await updateArticle(d.articulo.id, { stock: nuevoStock });
          }
        }
      }
      // 3. Crear los medios de pago
      for (const m of mediosPago) {
        if (m.cuenta && m.monto > 0) {
          await createOrdenVentaMediosPago({
            fk_id_orden: ordenVenta.id,
            fk_id_cuenta_tesoreria: m.cuenta.id,
            monto_pagado: m.monto,
          });
        }
      }
      // 4. Crear los impuestos
      for (const imp of impuestos) {
        await createOrdenVentaImpuestos({
          id_orden: ordenVenta.id,
          porcentaje_iva: imp.porcentaje_iva,
          base_gravada: imp.base_gravada,
          monto_iva: imp.monto_iva,
        });
      }
      // 5. Refrescar la tabla de ventas (si hay callback o prop para hacerlo)
      if (onVentaGuardada) onVentaGuardada();
      // 6. Cerrar el popup y mostrar feedback
      onOpenChange(false);
      showToast("Venta registrada con éxito");
      // Opcional: mostrar toast de éxito
    } catch (e: any) {
      console.error("Error al guardar la venta:", e);
      setError(e?.message || e?.error_description || "Error al guardar la venta");
    }
    setLoading(false);
  }

  // Estado para el detalle de impuestos
  const [impuestos, setImpuestos] = useState([
    { porcentaje_iva: 21, base_gravada: 0, monto_iva: 0 },
  ]);

  // Handler para cambio de impuesto
  function handleImpuestoChange(idx: number, field: 'porcentaje_iva' | 'base_gravada' | 'monto_iva', value: number) {
    setImpuestos(impuestos => {
      const nuevo = [...impuestos];
      nuevo[idx][field] = value;
      return nuevo;
    });
  }
  // Handler para agregar/quitar impuesto
  function agregarImpuesto() {
    setImpuestos(impuestos => [...impuestos, { porcentaje_iva: 21, base_gravada: 0, monto_iva: 0 }]);
  }
  function quitarImpuesto(idx: number) {
    setImpuestos(impuestos => impuestos.length > 1 ? impuestos.filter((_, i) => i !== idx) : impuestos);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Venta</DialogTitle>
          <DialogDescription>
            Completa los datos para registrar una nueva venta.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-8">Cargando datos...</div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="mt-2">
            <TabsList>
              <TabsTrigger value="cabecera">Cabecera</TabsTrigger>
              <TabsTrigger value="detalle">Detalle</TabsTrigger>
              <TabsTrigger value="medios">Medios de pago</TabsTrigger>
              <TabsTrigger value="impuestos">Impuestos</TabsTrigger>
              <TabsTrigger value="verificacion">Verificación</TabsTrigger>
            </TabsList>
            <TabsContent value="cabecera">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Cliente</label>
                  <select className="w-full border rounded px-2 py-1" value={clienteSeleccionado ?? ""} onChange={e => setClienteSeleccionado(Number(e.target.value) || null)}>
                    <option value="">Seleccionar cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.razon_social}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Usuario</label>
                  <select className="w-full border rounded px-2 py-1" value={usuarioSeleccionado ?? ""} onChange={e => setUsuarioSeleccionado(Number(e.target.value) || null)}>
                    <option value="">Seleccionar usuario</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Tipo de comprobante</label>
                  <select className="w-full border rounded px-2 py-1" value={tipoComprobanteSeleccionado ?? ""} onChange={e => setTipoComprobanteSeleccionado(Number(e.target.value) || null)}>
                    <option value="">Seleccionar tipo</option>
                    {tiposComprobantesValidos.map((tc) => (
                      <option key={tc.id} value={tc.id}>{tc.descripcion}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Fecha</label>
                  <input type="date" className="w-full border rounded px-2 py-1" value={format(new Date(), "yyyy-MM-dd")}
                    readOnly disabled />
                </div>
              </div>
              {error && <div className="text-red-600 mt-2">{error}</div>}
            </TabsContent>
            <TabsContent value="detalle">
              <div className="mb-2">Agrega artículos, cantidad y precio:</div>
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
                <div className="font-bold">Total: ${total.toFixed(2)}</div>
              </div>
            </TabsContent>
            <TabsContent value="medios">
              <div className="mb-2">Selecciona cuentas de tesorería y montos pagados (estructura)</div>
              <table className="min-w-full text-sm mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1 text-left">Cuenta Tesorería</th>
                    <th className="px-2 py-1 text-left">Monto pagado</th>
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
              <Button size="sm" variant="outline" onClick={agregarMedioPago}>Agregar medio de pago</Button>
              {mediosPagoIncompletos && (
                <div className="text-red-600 text-xs mt-1">
                  La suma de los montos de los medios de pago debe ser igual al total de la venta ({total.toFixed(2)}). Diferencia: {diferenciaMediosPago > 0 ? "+" : ""}{diferenciaMediosPago.toFixed(2)}
                </div>
              )}
              {hayCuentasDuplicadas && (
                <div className="text-red-600 text-xs mt-1">
                  Hay cuentas de tesorería duplicadas en los medios de pago. Por favor, corrige.
                </div>
              )}
            </TabsContent>
            <TabsContent value="impuestos">
              <div className="mb-2">Detalle de impuestos:</div>
              <table className="min-w-full text-sm border mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-2 py-1">% IVA</th>
                    <th className="px-2 py-1">Base gravada</th>
                    <th className="px-2 py-1">Monto IVA</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {impuestos.map((imp, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1">
                        <select className="w-24 border rounded px-2 py-1" value={imp.porcentaje_iva} onChange={e => handleImpuestoChange(idx, 'porcentaje_iva', Number(e.target.value))}>
                          <option value={0}>0%</option>
                          <option value={10.5}>10.5%</option>
                          <option value={21}>21%</option>
                          <option value={27}>27%</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="w-24 border rounded px-2 py-1" value={imp.base_gravada} onChange={e => handleImpuestoChange(idx, 'base_gravada', Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="w-24 border rounded px-2 py-1" value={imp.monto_iva} onChange={e => handleImpuestoChange(idx, 'monto_iva', Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1">
                        <button className="text-red-600 hover:underline" onClick={() => quitarImpuesto(idx)}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="text-blue-600 hover:underline" onClick={agregarImpuesto}>+ Agregar línea</button>
            </TabsContent>
            <TabsContent value="verificacion">
              <div className="mb-2 font-bold">Verificación final de la venta</div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-medium">Cliente</label>
                  <div className="border rounded px-2 py-1 bg-gray-50">{clientes.find(c => c.id === clienteSeleccionado)?.razon_social || "-"}</div>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Usuario</label>
                  <div className="border rounded px-2 py-1 bg-gray-50">{usuarios.find(u => u.id === usuarioSeleccionado)?.nombre || "-"}</div>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Tipo de comprobante</label>
                  <div className="border rounded px-2 py-1 bg-gray-50">{tiposComprobantesValidos.find(tc => tc.id === tipoComprobanteSeleccionado)?.descripcion || "-"}</div>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Fecha</label>
                  <div className="border rounded px-2 py-1 bg-gray-50">{format(new Date(), "yyyy-MM-dd")}</div>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Subtotal</label>
                  <input type="number" className="w-full border rounded px-2 py-1" value={total} readOnly />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Total</label>
                  <input type="number" className="w-full border rounded px-2 py-1" value={total} readOnly />
                </div>
              </div>
              <div className="mb-2 font-semibold">Resumen de artículos, medios de pago e impuestos cargados:</div>
              {/* Aquí puedes mostrar un resumen tabular de los detalles y medios de pago si lo deseas */}
              
              {/* Resumen de artículos */}
              <div className="mb-4">
                <div className="font-semibold text-sm mb-2">Artículos ({detalle.filter(d => d.articulo && d.cantidad > 0).length}):</div>
                <div className="border rounded p-2 bg-gray-50 max-h-32 overflow-y-auto">
                  {detalle.filter(d => d.articulo && d.cantidad > 0).map((d, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span>{d.articulo?.descripcion}</span>
                      <span>{d.cantidad} x ${d.precio.toFixed(2)} = ${d.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {detalle.filter(d => d.articulo && d.cantidad > 0).length === 0 && (
                    <div className="text-gray-500 text-sm">No hay artículos agregados</div>
                  )}
                </div>
              </div>

              {/* Resumen de medios de pago */}
              <div className="mb-4">
                <div className="font-semibold text-sm mb-2">Medios de pago ({mediosPago.filter(m => m.cuenta && m.monto > 0).length}):</div>
                <div className="border rounded p-2 bg-gray-50">
                  {mediosPago.filter(m => m.cuenta && m.monto > 0).map((m, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span>{m.cuenta?.descripcion}</span>
                      <span>${m.monto.toFixed(2)}</span>
                    </div>
                  ))}
                  {mediosPago.filter(m => m.cuenta && m.monto > 0).length === 0 && (
                    <div className="text-gray-500 text-sm">No hay medios de pago configurados</div>
                  )}
                  {mediosPago.filter(m => m.cuenta && m.monto > 0).length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total medios de pago:</span>
                        <span>${sumaMediosPago.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total venta:</span>
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

              {/* Resumen de impuestos */}
              <div className="mb-4">
                <div className="font-semibold text-sm mb-2">Impuestos ({impuestos.length}):</div>
                <div className="border rounded p-2 bg-gray-50">
                  {impuestos.map((imp, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span>IVA {imp.porcentaje_iva}%</span>
                      <span>Base: ${imp.base_gravada.toFixed(2)} | IVA: ${imp.monto_iva.toFixed(2)}</span>
                    </div>
                  ))}
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
            onClick={handleGuardarVenta}
            disabled={loading || !detalle.some(linea => linea.cantidad > 0) || detalle.some(linea => !linea.cantidad || isNaN(linea.cantidad) || Number(linea.cantidad) <= 0) || mediosPagoIncompletos || hayCuentasDuplicadas}
          >
            Guardar venta
          </Button>
          {detalle.some(linea => !linea.cantidad || isNaN(linea.cantidad) || Number(linea.cantidad) <= 0) && (
            <div className="text-red-600 text-xs mt-1">Todas las líneas deben tener una cantidad válida mayor a 0.</div>
          )}
        </div>
      </DialogContent>
      {/* Modal de error de caja/lote */}
      <Dialog open={showLoteError} onOpenChange={setShowLoteError}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Caja cerrada</DialogTitle>
            <DialogDescription>
              Debe haber una caja abierta para registrar la venta. Por favor, abra la caja antes de continuar.
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
    </Dialog>
  );
} 