"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { getOrdenesVenta } from "@/services/ordenesVenta";
import { OrdenVenta } from "@/types/ordenVenta";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { VentaFormDialog } from "@/components/ventas/venta-form-dialog";
import { ShoppingCart, Eye, Printer, X, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/utils";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";

export default function VentasPage() {
  const [ventas, setVentas] = useState<OrdenVenta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [notasCreditoPorVenta, setNotasCreditoPorVenta] = useState<Map<number, number>>(new Map());
  const [filtro, setFiltro] = useState("");
  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    fecha: true,
    cliente: true,
    cajero: true,
    tipoComprobante: true,
    total: true,
    acciones: true,
  });

  // Memoizar funciones de búsqueda para evitar re-renderizados
  const getClienteNombre = useCallback((id: number | null) => {
    if (!id) return "N/A";
    const cliente = clientes.find(c => c.id === id);
    return cliente ? cliente.razon_social : id.toString();
  }, [clientes]);

  const getUsuarioNombre = useCallback((id: number | null) => {
    if (!id) return "N/A";
    const usuario = usuarios.find(u => u.id === id);
    return usuario ? usuario.nombre : id.toString();
  }, [usuarios]);

  const getTipoComprobanteNombre = useCallback((id: number | null) => {
    if (!id) return "N/A";
    const tipo = tiposComprobantes.find(t => t.id === id);
    return tipo ? tipo.descripcion : id.toString();
  }, [tiposComprobantes]);

  // Memoizar ventas filtradas
  const ventasFiltradas = useMemo(() => {
    if (!filtro.trim()) return ventas;
    
    const filtroLower = filtro.toLowerCase();
    return ventas.filter(venta => {
      const clienteNombre = getClienteNombre(venta.fk_id_entidades).toLowerCase();
      const usuarioNombre = getUsuarioNombre(venta.fk_id_usuario).toLowerCase();
      const tipoComprobante = getTipoComprobanteNombre(venta.fk_id_tipo_comprobante).toLowerCase();
      
      return (
        venta.id.toString().includes(filtroLower) ||
        clienteNombre.includes(filtroLower) ||
        usuarioNombre.includes(filtroLower) ||
        tipoComprobante.includes(filtroLower) ||
        (venta.fecha?.includes(filtroLower) || false) ||
        venta.total.toString().includes(filtroLower)
      );
    });
  }, [ventas, filtro, getClienteNombre, getUsuarioNombre, getTipoComprobanteNombre]);

  // Memoizar ventas paginadas
  const ventasPagina = useMemo(() => {
    const totalPaginas = Math.ceil(ventasFiltradas.length / VENTAS_POR_PAGINA);
    const paginaValida = Math.min(paginaActual, totalPaginas);
    if (paginaValida !== paginaActual && totalPaginas > 0) {
      setPaginaActual(paginaValida);
    }
    return ventasFiltradas.slice((paginaValida - 1) * VENTAS_POR_PAGINA, paginaValida * VENTAS_POR_PAGINA);
  }, [ventasFiltradas, paginaActual]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(ventasFiltradas.length / VENTAS_POR_PAGINA);
  }, [ventasFiltradas]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Cargar datos en paralelo para mejor rendimiento
        const [ventasData, clientesData, usuariosData, articulosData, cuentasData, tiposData] = await Promise.all([
          getOrdenesVenta(),
          getClientes(),
          getUsuarios(),
          getArticles(),
          getCuentasTesoreria(),
          getTiposComprobantes(),
        ]);
        
        setVentas(ventasData);
        setClientes(clientesData);
        setUsuarios(usuariosData);
        setArticulos(articulosData);
        setCuentas(cuentasData);
        setTiposComprobantes(tiposData);
        
        // Procesar ventas anuladas
        const ventasAnuladasSet = new Set<number>();
        const notasCreditoPorVentaMap = new Map<number, number>();
        const notasCredito = ventasData.filter(v => v.fk_id_tipo_comprobante === 2);
        
        for (const notaCredito of notasCredito) {
          if (notaCredito.fk_id_orden_anulada) {
            ventasAnuladasSet.add(notaCredito.fk_id_orden_anulada);
            notasCreditoPorVentaMap.set(notaCredito.fk_id_orden_anulada, notaCredito.id);
          }
        }
        setNotasCreditoPorVenta(notasCreditoPorVentaMap);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        setError("Error al cargar ventas");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Función para refrescar datos
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdenesVenta();
      setVentas(data);
      
      // Reprocesar ventas anuladas
      const ventasAnuladasSet = new Set<number>();
      const notasCreditoPorVentaMap = new Map<number, number>();
      const notasCredito = data.filter(v => v.fk_id_tipo_comprobante === 2);
      
      for (const notaCredito of notasCredito) {
        if (notaCredito.fk_id_orden_anulada) {
          ventasAnuladasSet.add(notaCredito.fk_id_orden_anulada);
          notasCreditoPorVentaMap.set(notaCredito.fk_id_orden_anulada, notaCredito.id);
        }
      }
      setNotasCreditoPorVenta(notasCreditoPorVentaMap);
    } catch (error) {
      console.error("Error al refrescar ventas:", error);
      setError("Error al refrescar ventas");
    } finally {
      setLoading(false);
    }
  }, []);

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
    doc.text(`Total: ${formatCurrency(venta.total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`, 20, y);
    doc.text(`Subtotal: ${formatCurrency(venta.subtotal, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`, 120, y);
    y += 10;
    // Tabla de artículos
    autoTable(doc, {
      startY: y,
      head: [["Artículo", "Cantidad", "Precio", "Subtotal"]],
      body: detalles.map(d => [
        articulos.find(a => a.id === d.fk_id_articulo)?.descripcion || d.fk_id_articulo,
        d.cantidad,
        `${formatCurrency(d.precio_unitario, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`,
        `${formatCurrency(d.cantidad * d.precio_unitario, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`
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
        `${formatCurrency(m.monto_pagado, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`
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
          `${formatCurrency(imp.base_gravada, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`,
          `${formatCurrency(imp.monto_iva, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`
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
    doc.text(`Total a devolver: ${formatCurrency(Math.abs(notaCredito.total), DEFAULT_CURRENCY, DEFAULT_LOCALE)}`, 20, y);
    doc.text(`Subtotal: ${formatCurrency(Math.abs(notaCredito.subtotal), DEFAULT_CURRENCY, DEFAULT_LOCALE)}`, 120, y);
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
        `${formatCurrency(d.precio_unitario, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`,
        `${formatCurrency(d.cantidad * d.precio_unitario, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`
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
        `${formatCurrency(m.monto_pagado, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`
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
          `${formatCurrency(imp.base_gravada, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`,
          `${formatCurrency(imp.monto_iva, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`
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

  return (
    <div className="w-full mt-6">
      <BreadcrumbBar />
      <div className="flex items-center justify-between mb-6 pl-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Gestión de Ventas</h1>
            <p className="text-muted-foreground text-base">Administra tus ventas, consulta el historial y registra nuevas operaciones.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={refreshData}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refrescar"}
          </Button>
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva venta
          </Button>
        </div>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center h-32 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando ventas...</span>
        </div>
      )}
      
      {!loading && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Buscar venta..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="max-w-xs"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-2">
                  Columnas <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.entries(columnVisibility).map(([col, visible]) => (
                  <DropdownMenuCheckboxItem
                    key={col}
                    checked={visible}
                    onCheckedChange={v => setColumnVisibility(cv => ({ ...cv, [col]: v }))}
                    className="capitalize"
                  >
                    {col === "id" ? "N° Orden" :
                     col === "fecha" ? "Fecha" :
                     col === "cliente" ? "Cliente" :
                     col === "cajero" ? "Cajero" :
                     col === "tipoComprobante" ? "Tipo Comprobante" :
                     col === "total" ? "Total" :
                     col === "acciones" ? "Acciones" : col}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {error && <div className="text-red-600 mb-4">{error}</div>}
          
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                {columnVisibility.id && <th className="px-2 py-1 text-left">N° Orden</th>}
                {columnVisibility.fecha && <th className="px-2 py-1 text-left">Fecha</th>}
                {columnVisibility.cliente && <th className="px-2 py-1 text-left">Cliente</th>}
                {columnVisibility.cajero && <th className="px-2 py-1 text-left">Cajero</th>}
                {columnVisibility.tipoComprobante && <th className="px-2 py-1 text-left">Tipo Comprobante</th>}
                {columnVisibility.total && <th className="px-2 py-1 text-left">Total</th>}
                {columnVisibility.acciones && <th className="px-2 py-1 text-left">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {ventasPagina.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {ventas.length === 0 ? "No hay ventas registradas." : "No se encontraron ventas con los filtros aplicados."}
                  </td>
                </tr>
              ) : (
                ventasPagina.map((v) => (
                  <tr key={v.id} className={`border-b ${v.anulada ? 'text-red-600 bg-red-50' : 'hover:bg-blue-50 transition-colors'}`}>
                    {columnVisibility.id && <td className="px-2 py-1 text-left">{v.id}</td>}
                    {columnVisibility.fecha && <td className="px-2 py-1">{
                      v.fecha ? new Date(v.fecha).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : ""
                    }</td>}
                    {columnVisibility.cliente && <td className="px-2 py-1">{getClienteNombre(v.fk_id_entidades)}</td>}
                    {columnVisibility.cajero && <td className="px-2 py-1">{getUsuarioNombre(v.fk_id_usuario)}</td>}
                    {columnVisibility.tipoComprobante && <td className="px-2 py-1">{getTipoComprobanteNombre(v.fk_id_tipo_comprobante)}</td>}
                    {columnVisibility.total && <td className="px-2 py-1">{
                      `${formatCurrency(v.total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`
                    }</td>}
                    {columnVisibility.acciones && <td className="px-2 py-1">
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
                      {/* Solo mostrar botón de anular si la venta NO está anulada */}
                      {esFactura(v) && !v.anulada && (
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
                    </td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Paginación */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {ventasFiltradas.length === 0 ? (
                "0 de 0 ventas."
              ) : (
                `${(paginaActual - 1) * VENTAS_POR_PAGINA + 1} - ${Math.min(paginaActual * VENTAS_POR_PAGINA, ventasFiltradas.length)} de ${ventasFiltradas.length} venta(s).`
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
        </div>
      )}
      
      {error && <div className="text-red-600 mt-2">{error}</div>}
      <VentaFormDialog open={openDialog} onOpenChange={setOpenDialog} onVentaGuardada={refreshData} />
      <Dialog open={openDetalle} onOpenChange={setOpenDetalle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de la venta N° {ventaSeleccionada?.id}</DialogTitle>
            <DialogDescription>
              Fecha: {ventaSeleccionada?.fecha?.slice(0, 10)}<br />
              Cliente: {getClienteNombre(ventaSeleccionada?.fk_id_entidades || null)}<br />
              Usuario: {getUsuarioNombre(ventaSeleccionada?.fk_id_usuario || null)}<br />
              Tipo de comprobante: {getTipoComprobanteNombre(ventaSeleccionada?.fk_id_tipo_comprobante || null)}<br />
              Total: ${formatCurrency(ventaSeleccionada?.total, DEFAULT_CURRENCY, DEFAULT_LOCALE)}
            </DialogDescription>
            {ventaSeleccionada && ventaSeleccionada.anulada && (
              <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded">
                <div className="text-red-800 font-medium flex items-center gap-1">
                  <span>⚠️</span> Esta venta ha sido anulada
                </div>
                <div className="text-red-700 text-sm mt-1">
                  Se generó una nota de crédito para anular esta venta.<br />
                  {notasCreditoPorVenta.has(ventaSeleccionada.id) ? (
                    <>
                      <span className="font-bold">Nota de crédito N°:</span> <span>{notasCreditoPorVenta.get(ventaSeleccionada.id)}</span>
                    </>
                  ) : (
                    <span className="font-bold">Nota de crédito no encontrada.</span>
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
                  <td className="px-2 py-1 text-right">${formatCurrency(d.precio_unitario, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</td>
                  <td className="px-2 py-1 text-right">${formatCurrency(d.cantidad * d.precio_unitario, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</td>
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
                  <td className="px-2 py-1 text-right">${formatCurrency(m.monto_pagado, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</td>
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
                  <td className="px-2 py-1 text-right">${formatCurrency(imp.base_gravada, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</td>
                  <td className="px-2 py-1 text-right">${formatCurrency(imp.monto_iva, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
      <NotaCreditoDialog 
        open={openNotaCredito} 
        onOpenChange={setOpenNotaCredito} 
        onNotaCreditoGuardada={refreshData}
        ventaAAnular={ventaAAnular}
      />
      <div className="mt-10">
        <TiposComprobantesContent />
      </div>
    </div>
  );
} 