"use client";
import React, { useEffect, useState } from "react";
import { getOrdenesVenta } from "@/services/ordenesVenta";
import { OrdenVenta } from "@/types/ordenVenta";
import { Button } from "@/components/ui/button";
import { VentaFormDialog } from "@/components/ventas/venta-form-dialog";
import { ShoppingCart } from "lucide-react";
import { TiposComprobantesContent } from "@/components/ventas/tipos-comprobantes-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getOrdenesVentaDetalle } from "@/services/ordenesVentaDetalle";
import { getOrdenesVentaMediosPago } from "@/services/ordenesVentaMediosPago";
import { getOrdenesVentaImpuestos } from "@/services/ordenesVentaImpuestos";
import { getClientes } from "@/services/clientes";
import { getUsuarios } from "@/services/usuarios";
import { getArticles } from "@/services/articles";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { getTiposComprobantes } from "@/services/tiposComprobantes";

export default function VentasPage() {
  const [ventas, setVentas] = useState<OrdenVenta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [detalleVenta, setDetalleVenta] = useState<unknown[]>([]);
  const [mediosPagoVenta, setMediosPagoVenta] = useState<unknown[]>([]);
  const [impuestosVenta, setImpuestosVenta] = useState<unknown[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<OrdenVenta | null>(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [clientes, setClientes] = useState<unknown[]>([]);
  const [usuarios, setUsuarios] = useState<unknown[]>([]);
  const [articulos, setArticulos] = useState<unknown[]>([]);
  const [cuentas, setCuentas] = useState<unknown[]>([]);
  const [tiposComprobantes, setTiposComprobantes] = useState<unknown[]>([]);

  useEffect(() => {
    fetchVentas();
    getClientes().then(setClientes);
    getUsuarios().then(setUsuarios);
    getArticles().then(setArticulos);
    getCuentasTesoreria().then(setCuentas);
    getTiposComprobantes().then(setTiposComprobantes);
  }, []);

  async function fetchVentas() {
    setError(null);
    try {
      const data = await getOrdenesVenta();
      setVentas(data);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      setError("Error al cargar ventas");
    }
  }

  async function handleVerVenta(venta: OrdenVenta) {
    setVentaSeleccionada(venta);
    setOpenDetalle(true);
    // Cargar detalles
    setDetalleVenta(await getOrdenesVentaDetalle(venta.id));
    setMediosPagoVenta(await getOrdenesVentaMediosPago(venta.id));
    setImpuestosVenta(await getOrdenesVentaImpuestos(venta.id));
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Gestión de Ventas</h1>
            <p className="text-muted-foreground text-base">Administra tus ventas, consulta el historial y registra nuevas operaciones.</p>
          </div>
        </div>
        <Button onClick={() => setOpenDialog(true)}>Nueva venta</Button>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">N° Orden</th>
              <th className="px-2 py-1 text-left">Fecha</th>
              <th className="px-2 py-1 text-left">Cliente</th>
              <th className="px-2 py-1 text-left">Usuario</th>
              <th className="px-2 py-1 text-left">Total</th>
              <th className="px-2 py-1 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-b">
                <td className="px-2 py-1 text-left">{v.id}</td>
                <td className="px-2 py-1">{v.fecha?.slice(0, 10)}</td>
                <td className="px-2 py-1">{v.fk_id_entidades}</td>
                <td className="px-2 py-1">{v.fk_id_usuario}</td>
                <td className="px-2 py-1">{v.total}</td>
                <td className="px-2 py-1">
                  <Button size="sm" variant="outline" onClick={() => handleVerVenta(v)}>Ver</Button>
                </td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted-foreground">No hay ventas registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      <VentaFormDialog open={openDialog} onOpenChange={setOpenDialog} onVentaGuardada={fetchVentas} />
      <Dialog open={openDetalle} onOpenChange={setOpenDetalle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de la venta N° {ventaSeleccionada?.id}</DialogTitle>
            <DialogDescription>
              Fecha: {ventaSeleccionada?.fecha?.slice(0, 10)}<br />
              Cliente: {(clientes.find(c => (c as any).id === ventaSeleccionada?.fk_id_entidades) as any)?.razon_social || ventaSeleccionada?.fk_id_entidades}<br />
              Usuario: {(usuarios.find(u => (u as any).id === ventaSeleccionada?.fk_id_usuario) as any)?.nombre || ventaSeleccionada?.fk_id_usuario}<br />
              Tipo de comprobante: {(tiposComprobantes.find(tc => (tc as any).id === ventaSeleccionada?.fk_id_tipo_comprobante) as any)?.descripcion || ventaSeleccionada?.fk_id_tipo_comprobante}<br />
              Total: ${ventaSeleccionada?.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>
          <div className="mb-2 font-semibold">Artículos</div>
          <table className="min-w-full text-sm border mb-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left">Artículo</th>
                <th className="px-2 py-1 text-right">Cantidad</th>
                <th className="px-2 py-1 text-right">Precio</th>
                <th className="px-2 py-1 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detalleVenta.map((d, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1 text-left">{articulos.find(a => a.id === d.fk_id_articulo)?.descripcion || d.fk_id_articulo}</td>
                  <td className="px-2 py-1 text-right">{d.cantidad}</td>
                  <td className="px-2 py-1 text-right">${d.precio_unitario?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-2 py-1 text-right">${(d.cantidad * d.precio_unitario)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-2 font-semibold">Medios de pago</div>
          <table className="min-w-full text-sm border mb-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left">Cuenta</th>
                <th className="px-2 py-1 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {mediosPagoVenta.map((m, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1 text-left">{cuentas.find(c => c.id === m.fk_id_cuenta_tesoreria)?.descripcion || m.fk_id_cuenta_tesoreria}</td>
                  <td className="px-2 py-1 text-right">${m.monto_pagado?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-2 font-semibold">Impuestos</div>
          <table className="min-w-full text-sm border mb-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-right">% IVA</th>
                <th className="px-2 py-1 text-right">Base gravada</th>
                <th className="px-2 py-1 text-right">Monto IVA</th>
              </tr>
            </thead>
            <tbody>
              {impuestosVenta.map((imp, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1 text-right">{imp.porcentaje_iva}</td>
                  <td className="px-2 py-1 text-right">${imp.base_gravada?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-2 py-1 text-right">${imp.monto_iva?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
      <div className="mt-10">
        <TiposComprobantesContent />
      </div>
    </div>
  );
} 