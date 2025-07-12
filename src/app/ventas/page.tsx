"use client";
import React, { useEffect, useState } from "react";
import { getOrdenesVenta } from "@/services/ordenesVenta";
import { OrdenVenta } from "@/types/ordenVenta";
import { Button } from "@/components/ui/button";
import { VentaFormDialog } from "@/components/ventas/venta-form-dialog";
import { ShoppingCart, Eye, Printer, X } from "lucide-react";
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
import { Article } from "@/types/article";
import { OrdenVentaDetalle, OrdenVentaMediosPago, OrdenVentaImpuestos } from "@/types/ordenVenta";
import { Cliente } from "@/types/cliente";
import { Usuario } from "@/types/usuario";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import { TipoComprobante } from "@/types/tipoComprobante";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NotaCreditoDialog } from "@/components/ventas/nota-credito-dialog";

export default function VentasPage() {
  const [ventas, setVentas] = useState<OrdenVenta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [detalleVenta, setDetalleVenta] = useState<OrdenVentaDetalle[]>([]);
  const [mediosPagoVenta, setMediosPagoVenta] = useState<OrdenVentaMediosPago[]>([]);
  const [impuestosVenta, setImpuestosVenta] = useState<OrdenVentaImpuestos[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<OrdenVenta | null>(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [articulos, setArticulos] = useState<Article[]>([]);
  const [cuentas, setCuentas] = useState<CuentaTesoreria[]>([]);
  const [tiposComprobantes, setTiposComprobantes] = useState<TipoComprobante[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const VENTAS_POR_PAGINA = 10;
  const [ventaAAnular, setVentaAAnular] = useState<OrdenVenta | null>(null);
  const [openNotaCredito, setOpenNotaCredito] = useState(false);
  const [ventasAnuladas, setVentasAnuladas] = useState<Set<number>>(new Set());
  const [notasCreditoPorVenta, setNotasCreditoPorVenta] = useState<Map<number, number>>(new Map());

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
      
      // Identificar ventas anuladas (que tienen notas de crédito asociadas)
      const ventasAnuladasSet = new Set<number>();
      const notasCreditoPorVentaMap = new Map<number, number>();
      const notasCredito = data.filter(v => v.fk_id_tipo_comprobante === 2);
      const ventasOriginales = data.filter(v => v.fk_id_tipo_comprobante !== 2);
      
      for (const notaCredito of notasCredito) {
        // Buscar la venta original que coincide por cliente, usuario, total absoluto, fecha y id menor
        const ventaOriginal = ventasOriginales.find(v => 
          v.fk_id_entidades === notaCredito.fk_id_entidades &&
          v.fk_id_usuario === notaCredito.fk_id_usuario &&
          Math.abs(v.total) === Math.abs(notaCredito.total) &&
          v.fecha === notaCredito.fecha &&
          v.id < notaCredito.id // Solo ventas anteriores
        );
        if (ventaOriginal) {
          ventasAnuladasSet.add(ventaOriginal.id);
          notasCreditoPorVentaMap.set(ventaOriginal.id, notaCredito.id);
        }
      }
      setVentasAnuladas(ventasAnuladasSet);
      setNotasCreditoPorVenta(notasCreditoPorVentaMap);
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

  // Generar PDF de la venta
  async function handleImprimirVenta(venta: OrdenVenta) {
    // Cargar detalles, medios de pago e impuestos
    const detalles = await getOrdenesVentaDetalle(venta.id);
    const medios = await getOrdenesVentaMediosPago(venta.id);
    const impuestos = await getOrdenesVentaImpuestos(venta.id);
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("ORDEN DE VENTA", 105, 18, { align: "center" });
    doc.setFontSize(12);
    let y = 30;
    doc.text(`N° Orden: ${venta.id}`, 20, y);
    doc.text(`Fecha: ${venta.fecha?.slice(0, 16) || ""}`, 120, y);
    y += 8;
    // doc.text(`Cliente: ${cliente?.razon_social || venta.fk_id_entidades}`, 20, y);
    // doc.text(`Doc: ${cliente?.num_doc || "-"}`, 120, y);
    y += 8;
    // doc.text(`Usuario: ${usuario?.nombre || venta.fk_id_usuario}`, 20, y);
    // doc.text(`Tipo comprobante: ${tipoComp?.descripcion || venta.fk_id_tipo_comprobante}`, 120, y);
    y += 8;
    doc.text(`Total: $${venta.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, y);
    doc.text(`Subtotal: $${venta.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, y);
    y += 10;
    // Tabla de artículos
    autoTable(doc, {
      startY: y,
      head: [["Artículo", "Cantidad", "Precio", "Subtotal"]],
      body: detalles.map(d => [
        articulos.find(a => a.id === d.fk_id_articulo)?.descripcion || d.fk_id_articulo,
        d.cantidad,
        `$${d.precio_unitario?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${(d.cantidad * d.precio_unitario)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } }
    });
    const afterArtY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    // Tabla de medios de pago
    autoTable(doc, {
      startY: afterArtY,
      head: [["Cuenta Tesorería", "Monto"]],
      body: medios.map(m => [
        cuentas.find(c => c.id === m.fk_id_cuenta_tesoreria)?.descripcion || m.fk_id_cuenta_tesoreria,
        `$${m.monto_pagado?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: "right" } }
    });
    let afterPagoY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    // Tabla de impuestos (si hay)
    if (impuestos.length > 0) {
      autoTable(doc, {
        startY: afterPagoY,
        head: [["% IVA", "Base gravada", "Monto IVA"]],
        body: impuestos.map(imp => [
          imp.porcentaje_iva,
          `$${imp.base_gravada?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${imp.monto_iva?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]),
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } }
      });
      afterPagoY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }
    // Pie de página
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el ${new Date().toLocaleString()}` , 20, 285);
    doc.save(`orden_venta_${venta.id}.pdf`);
  }

  // Generar PDF de la nota de crédito
  async function handleImprimirNotaCredito(notaCredito: OrdenVenta) {
    // Buscar la venta original anulada
    const ventaOriginal = ventas.find(v => 
      v.id !== notaCredito.id && 
      v.fk_id_entidades === notaCredito.fk_id_entidades &&
      v.fk_id_usuario === notaCredito.fk_id_usuario &&
      Math.abs(v.total) === Math.abs(notaCredito.total) &&
      v.fecha === notaCredito.fecha &&
      v.fk_id_tipo_comprobante !== 2
    );

    // Cargar detalles, medios de pago e impuestos
    const detalles = await getOrdenesVentaDetalle(notaCredito.id);
    const medios = await getOrdenesVentaMediosPago(notaCredito.id);
    const impuestos = await getOrdenesVentaImpuestos(notaCredito.id);
    
    const doc = new jsPDF();
    
    // Título principal
    doc.setFontSize(20);
    doc.setTextColor(200, 0, 0); // Rojo para nota de crédito
    doc.text("NOTA DE CRÉDITO", 105, 18, { align: "center" });
    
    // Línea decorativa
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    // Resetear color
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    let y = 35;
    doc.text(`N° Nota de Crédito: ${notaCredito.id}`, 20, y);
    doc.text(`Fecha: ${notaCredito.fecha?.slice(0, 16) || ""}`, 120, y);
    y += 8;
    
    if (ventaOriginal) {
      doc.text(`Venta anulada N°: ${ventaOriginal.id}`, 20, y);
      doc.text(`Tipo venta original: ${tiposComprobantes.find(tc => tc.id === ventaOriginal.fk_id_tipo_comprobante)?.descripcion || ventaOriginal.fk_id_tipo_comprobante}`, 120, y);
      y += 8;
    }
    
    // doc.text(`Cliente: ${cliente?.razon_social || notaCredito.fk_id_entidades}`, 20, y);
    // doc.text(`Doc: ${cliente?.num_doc || "-"}`, 120, y);
    y += 8;
    
    // doc.text(`Usuario: ${usuario?.nombre || notaCredito.fk_id_usuario}`, 20, y);
    // doc.text(`Tipo comprobante: ${tipoComp?.descripcion || notaCredito.fk_id_tipo_comprobante}`, 120, y);
    y += 8;
    
    // Totales en rojo y negativos
    doc.setTextColor(200, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Total a devolver: $${Math.abs(notaCredito.total)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, y);
    doc.text(`Subtotal: $${Math.abs(notaCredito.subtotal)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 120, y);
    y += 10;
    
    // Resetear color
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    // Tabla de artículos
    autoTable(doc, {
      startY: y,
      head: [["Artículo", "Cantidad", "Precio", "Subtotal"]],
      body: detalles.map(d => [
        articulos.find(a => a.id === d.fk_id_articulo)?.descripcion || d.fk_id_articulo,
        d.cantidad,
        `$${d.precio_unitario?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${(d.cantidad * d.precio_unitario)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      theme: "grid",
      headStyles: { 
        fillColor: [200, 0, 0], // Rojo para nota de crédito
        textColor: 255, 
        fontStyle: "bold" 
      },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } }
    });
    
    const afterArtY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    
    // Tabla de medios de cobro
    autoTable(doc, {
      startY: afterArtY,
      head: [["Cuenta Tesorería", "Monto a devolver"]],
      body: medios.map(m => [
        cuentas.find(c => c.id === m.fk_id_cuenta_tesoreria)?.descripcion || m.fk_id_cuenta_tesoreria,
        `$${m.monto_pagado?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]),
      theme: "grid",
      headStyles: { 
        fillColor: [200, 0, 0], // Rojo para nota de crédito
        textColor: 255, 
        fontStyle: "bold" 
      },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: "right" } }
    });
    
    let afterPagoY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    
    // Tabla de impuestos (si hay)
    if (impuestos.length > 0) {
      autoTable(doc, {
        startY: afterPagoY,
        head: [["% IVA", "Base gravada", "Monto IVA"]],
        body: impuestos.map(imp => [
          imp.porcentaje_iva,
          `$${imp.base_gravada?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${imp.monto_iva?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]),
        theme: "grid",
        headStyles: { 
          fillColor: [200, 0, 0], // Rojo para nota de crédito
          textColor: 255, 
          fontStyle: "bold" 
        },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } }
      });
      afterPagoY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }
    
    // Información adicional
    const finalY = afterPagoY + 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Esta nota de crédito anula la venta original y reingresa los artículos al stock.", 20, finalY);
    doc.text("El dinero será devuelto al cliente según los medios de cobro especificados.", 20, finalY + 5);
    
    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el ${new Date().toLocaleString()}`, 20, 285);
    
    // Descargar el PDF
    const fileName = `nota_credito_${notaCredito.id}.pdf`;
    doc.save(fileName);
  }

  // Función para verificar si una venta es una factura (no nota de crédito)
  function esFactura(venta: OrdenVenta) {
    return venta.fk_id_tipo_comprobante !== 2; // 2 = NOTA DE CREDITO
  }

  // Función para manejar la anulación de venta
  function handleAnularVenta(venta: OrdenVenta) {
    setVentaAAnular(venta);
    setOpenNotaCredito(true);
  }

  const totalPaginas = Math.ceil(ventas.length / VENTAS_POR_PAGINA);
  const ventasPagina = ventas.slice((paginaActual - 1) * VENTAS_POR_PAGINA, paginaActual * VENTAS_POR_PAGINA);

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
              <th className="px-2 py-1 text-left">Cajero</th>
              <th className="px-2 py-1 text-left">Tipo Comprobante</th>
              <th className="px-2 py-1 text-left">Total</th>
              <th className="px-2 py-1 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventasPagina.map((v) => (
              <tr key={v.id} className={`border-b ${ventasAnuladas.has(v.id) ? 'text-red-600 bg-red-50' : ''}`}>
                <td className="px-2 py-1 text-left">{v.id}</td>
                <td className="px-2 py-1">{
                  v.fecha ? `${v.fecha.slice(0, 10)} ${v.fecha.slice(11, 16)}` : ""
                }</td>
                <td className="px-2 py-1">{clientes.find(c => c.id === v.fk_id_entidades)?.razon_social || v.fk_id_entidades}</td>
                <td className="px-2 py-1">{usuarios.find(u => u.id === v.fk_id_usuario)?.nombre || v.fk_id_usuario}</td>
                <td className="px-2 py-1">{tiposComprobantes.find(tc => tc.id === v.fk_id_tipo_comprobante)?.descripcion || v.fk_id_tipo_comprobante}</td>
                <td className="px-2 py-1">{
                  `$${v.total?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }</td>
                <td className="px-2 py-1">
                  <Button size="icon" variant="outline" onClick={() => handleVerVenta(v)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  {v.fk_id_tipo_comprobante === 2 ? (
                    <Button size="icon" variant="outline" className="ml-1" onClick={() => handleImprimirNotaCredito(v)} title="Imprimir Nota de Crédito">
                      <Printer className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button size="icon" variant="outline" className="ml-1" onClick={() => handleImprimirVenta(v)} title="Imprimir PDF">
                      <Printer className="w-4 h-4" />
                    </Button>
                  )}
                  {esFactura(v) && !ventasAnuladas.has(v.id) && (
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="ml-1" 
                      onClick={() => handleAnularVenta(v)} 
                      title="Anular venta"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  {ventasAnuladas.has(v.id) && (
                    <span className="ml-1 text-xs text-red-600 font-medium">ANULADA</span>
                  )}
                </td>
              </tr>
            ))}
            {ventasPagina.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted-foreground">No hay ventas registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {ventas.length === 0 ? (
              "0 de 0 filas."
            ) : (
              `${(paginaActual - 1) * VENTAS_POR_PAGINA + 1} - ${Math.min(paginaActual * VENTAS_POR_PAGINA, ventas.length)} de ${ventas.length} fila(s).`
            )}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
            >
              Siguiente
            </button>
          </div>
        </div>
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
            {ventasAnuladas.has(ventaSeleccionada?.id || 0) && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                <div className="text-red-800 font-medium">⚠️ Esta venta ha sido anulada</div>
                <div className="text-red-700 text-sm">
                  Se generó una nota de crédito para anular esta venta.
                  {notasCreditoPorVenta.has(ventaSeleccionada?.id || 0) && (
                    <div className="mt-1">
                      <strong>Nota de crédito N°:</strong> {notasCreditoPorVenta.get(ventaSeleccionada?.id || 0)}
                    </div>
                  )}
                </div>
              </div>
            )}
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
      <NotaCreditoDialog 
        open={openNotaCredito} 
        onOpenChange={setOpenNotaCredito} 
        onNotaCreditoGuardada={fetchVentas}
        ventaAAnular={ventaAAnular}
      />
      <div className="mt-10">
        <TiposComprobantesContent />
      </div>
    </div>
  );
} 