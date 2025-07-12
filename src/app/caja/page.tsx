"use client";
import React, { useEffect, useState } from "react";
import { getCajas } from "@/services/cajas";
import { Caja } from "@/types/caja";
import { format } from "date-fns";
import { createLoteOperacion } from "@/services/lotesOperaciones";
import { createDetalleLoteOperacion } from "@/services/detalleLotesOperaciones";
import { LotesOperacionesContent } from "@/components/lotes-operaciones-content";
import { getLoteCajaAbiertaPorUsuario, cerrarLoteApertura } from "@/services/lotesOperaciones";
import { getDetalleLotesOperaciones } from "@/services/detalleLotesOperaciones";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { getOrdenesVenta } from "@/services/ordenesVenta";
import { getOrdenesVentaMediosPago } from "@/services/ordenesVentaMediosPago";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getLotesOperaciones } from "@/services/lotesOperaciones";
import { getUsuarios } from "@/services/usuarios";
import { Usuario } from "@/types/usuario";
import { OrdenVenta } from "@/types/ordenVenta";
import { OrdenVentaMediosPago } from "@/types/ordenVenta";

interface AperturaCaja {
  caja: string;
  saldoInicial: string;
  fechaApertura: string;
  horaApertura: string;
  fechaCierre: string | null;
  horaCierre: string | null;
  id_lote?: number;
}

// const TURNOS = [
//   { label: "Mañana", value: "mañana" },
//   { label: "Tarde", value: "tarde" },
//   { label: "Noche", value: "noche" },
// ];

// function nowDate() {
//   const d = new Date();
//   return d.toISOString().slice(0, 10);
// }
// function nowTime() {
//   const d = new Date();
//   return d.toTimeString().slice(0, 5);
// }

export default function CajaPage() {
  // Formulario de apertura de caja (simulado)
  const [cajaSeleccionada, setCajaSeleccionada] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [cajaAbierta, setCajaAbierta] = useState<string | null>(null);
  const [aperturaError, setAperturaError] = useState<string | null>(null);
  const [observacionesApertura, setObservacionesApertura] = useState("");

  // CRUD de cajas de turno
  const [cajas, setCajas] = useState<Caja[]>([]);
  // const [loading, setLoading] = useState(false);
  // const [crudError, setCrudError] = useState<string | null>(null);
  // const [editCaja, setEditCaja] = useState<Caja | null>(null);
  // const [descripcion, setDescripcion] = useState("");
  // const [turno, setTurno] = useState("");

  // Simulación de historial de aperturas/cierres
  const [historial] = useState<AperturaCaja[]>([]);
  const [aperturaActual, setAperturaActual] = useState<AperturaCaja | null>(null);

  // Ref para refrescar lotes
  const [refreshLotes, setRefreshLotes] = useState(0);

  const [showCierreModal, setShowCierreModal] = useState(false);
  // const [movimientos, setMovimientos] = useState<DetalleLoteOperacion[]>([]);
  const [resumen, setResumen] = useState<{ cuenta: string, ingresos: number, egresos: number }[]>([]);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: "" });
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>("");

  const fetchCajaAbierta = async () => {
    // Por ahora usuario id 1
    const lote = await getLoteCajaAbiertaPorUsuario(1);
    if (lote) {
      setCajaAbierta(lote.fk_id_caja);
      setAperturaActual({
        caja: cajas.find(c => c.id === lote.fk_id_caja)?.descripcion || lote.fk_id_caja,
        saldoInicial: lote.saldo_inicial?.toString() || '', // Obtener saldo del lote
        fechaApertura: lote.fecha_apertura?.slice(0, 10),
        horaApertura: lote.hora_apertura,
        fechaCierre: null,
        horaCierre: null,
        id_lote: lote.id_lote,
      });
    } else {
      setCajaAbierta(null);
      setAperturaActual(null);
    }
  };

  // Cambiar useEffect para que el array de dependencias esté vacío:
  useEffect(() => {
    fetchCajas();
    fetchCajaAbierta();
    getCuentasTesoreria().then(setCuentasTesoreria);
    getUsuarios().then(setUsuarios);
  }, []);

  const fetchCajas = async () => {
    try {
      const data = await getCajas();
      setCajas(data);
    } catch {
      // setCrudError("Error al cargar cajas");
    } finally {
      // setLoading(false);
    }
  };

  // --- Apertura de caja (simulado, en el futuro irá a otra tabla) ---
  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setAperturaError(null);
    if (!cajaSeleccionada || !saldoInicial || !usuarioSeleccionado) {
      setAperturaError("Selecciona una caja, usuario y saldo inicial");
      return;
    }
    if (cajaAbierta) {
      setAperturaError("Ya hay una caja abierta. Cierra la caja antes de abrir otra.");
      return;
    }
    const now = new Date();
    const hoy = format(now, "yyyy-MM-dd");
    setCajaAbierta(cajaSeleccionada);
    setAperturaActual({
      caja: cajaSeleccionada,
      saldoInicial,
      fechaApertura: hoy,
      horaApertura: format(now, "HH:mm"),
      fechaCierre: null,
      horaCierre: null,
      // observaciones: observacionesApertura, // No corresponde aquí
    });
    setCajaSeleccionada("");
    setSaldoInicial("");
    setUsuarioSeleccionado("");
    setObservacionesApertura("");
    showToast("Caja abierta correctamente");

    // --- Lógica de lotes de operaciones ---
    try {
      // Buscar la caja por descripción
      const cajaObj = cajas.find(c => c.descripcion === cajaSeleccionada);
      if (!cajaObj) return;
      // Crear lote de apertura
      const lote = await createLoteOperacion({
        fk_id_usuario: parseInt(usuarioSeleccionado, 10),
        fk_id_caja: cajaObj.id,
        abierto: true,
        tipo_lote: "apertura",
        fecha_apertura: hoy,
        hora_apertura: format(now, "HH:mm"),
        fecha_cierre: null, // <-- Debe ser null al abrir
        hora_cierre: null,
        observaciones: observacionesApertura || null,
        saldo_inicial: parseFloat(saldoInicial), // Agregar saldo inicial
      });
      // Crear detalle del lote
      await createDetalleLoteOperacion({
        fk_id_lote: lote.id_lote,
        fk_id_cuenta_tesoreria: 1, // cuenta prueba
        tipo: 'ingreso',
        monto: parseFloat(saldoInicial),
      });
      setRefreshLotes(x => x + 1);
    } catch {
      // Silenciar error para no romper UI simulada
      console.error("Error al crear lote:");
    }
    await fetchCajaAbierta();
  };

  async function handleCerrarCaja() {
    if (!aperturaActual || !aperturaActual.id_lote) return;
    setLoadingCierre(true);
    // Traer todos los movimientos reales del lote
    const movimientos = await getDetalleLotesOperaciones(aperturaActual.id_lote);
    // Traer todas las ventas del lote abierto
    const ventas = await getOrdenesVenta();
    const ventasLote = ventas.filter(v => v.fk_id_lote === aperturaActual.id_lote);
    // Traer todos los medios de pago de esas ventas
    const pagosPorCuenta: Record<number, number> = {};
    for (const cuenta of cuentasTesoreria) {
      pagosPorCuenta[cuenta.id] = 0;
    }
    for (const venta of ventasLote) {
      const medios = await getOrdenesVentaMediosPago(venta.id);
      for (const m of medios) {
        if (pagosPorCuenta[m.fk_id_cuenta_tesoreria] === undefined) pagosPorCuenta[m.fk_id_cuenta_tesoreria] = 0;
        if (venta.fk_id_tipo_comprobante === 2) {
          // Nota de crédito: restar el monto (devolución)
          pagosPorCuenta[m.fk_id_cuenta_tesoreria] -= m.monto_pagado;
        } else {
          pagosPorCuenta[m.fk_id_cuenta_tesoreria] += m.monto_pagado;
        }
      }
    }
    // Sumar ingresos y egresos por cuenta (movimientos + ventas)
    const resumenPorCuenta: Record<number, { cuenta: string, ingresos: number, egresos: number }> = {};
    for (const cuenta of cuentasTesoreria) {
      resumenPorCuenta[cuenta.id] = { cuenta: cuenta.descripcion, ingresos: Math.max(0, pagosPorCuenta[cuenta.id] || 0), egresos: 0 };
    }
    for (const mov of movimientos) {
      if (resumenPorCuenta[mov.fk_id_cuenta_tesoreria]) {
        if (mov.tipo === 'ingreso') {
          resumenPorCuenta[mov.fk_id_cuenta_tesoreria].ingresos += Math.abs(mov.monto);
        } else if (mov.tipo === 'egreso') {
          resumenPorCuenta[mov.fk_id_cuenta_tesoreria].egresos += Math.abs(mov.monto);
        }
      }
    }
    const resumenFinal = Object.values(resumenPorCuenta);
    setResumen(resumenFinal);
    setShowCierreModal(true);
    setLoadingCierre(false);
    showToast("Caja cerrada correctamente");
  }

  async function confirmarCierreCaja() {
    setShowCierreModal(false);
    if (!aperturaActual || !aperturaActual.id_lote) return;
    setLoadingCierre(true);
    const now = new Date();
    const hoyCierre = format(now, "yyyy-MM-dd");
    // Registrar saldo inicial como ingreso en efectivo al cierre
    const saldoInicial = parseFloat(aperturaActual.saldoInicial || '0');
    if (saldoInicial > 0 && cuentasTesoreria.length > 0) {
      const cuentaEfectivo = cuentasTesoreria.find(c => c.descripcion.toLowerCase().includes('efectivo'));
      if (cuentaEfectivo) {
        await createDetalleLoteOperacion({
          fk_id_lote: aperturaActual.id_lote,
          fk_id_cuenta_tesoreria: cuentaEfectivo.id,
          tipo: 'ingreso',
          monto: saldoInicial,
        });
      }
    }
    await cerrarLoteApertura(aperturaActual.id_lote, hoyCierre, format(now, "HH:mm"));
    setCajaAbierta(null);
    setAperturaActual(null);
    setLoadingCierre(false);
    showToast("Cierre de caja confirmado");
  }

  async function generarPDFCierreCaja() {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("CIERRE DE CAJA", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Caja: ${aperturaActual?.caja || "N/A"}`, 20, 35);
    doc.text(`Saldo inicial: $${parseFloat(aperturaActual?.saldoInicial || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 45);
    doc.text(`Fecha de apertura: ${aperturaActual?.fechaApertura || "N/A"}`, 20, 55);
    doc.text(`Hora de apertura: ${aperturaActual?.horaApertura || "N/A"}`, 20, 65);
    doc.text(`Fecha de cierre: ${format(new Date(), "yyyy-MM-dd")}`, 20, 75);
    doc.text(`Hora de cierre: ${format(new Date(), "HH:mm")}`, 20, 85);

    // --- Bloque resumen de ventas y notas de crédito ---
    const resumenY = 95;
    let ventasLote: OrdenVenta[] = [];
    let cuentasTesoreria: CuentaTesoreria[] = [];
    if (aperturaActual && aperturaActual.id_lote) {
      const [ventas, cuentasArr] = await Promise.all([
        getOrdenesVenta(),
        getCuentasTesoreria(),
      ]);
      ventasLote = ventas.filter((v: OrdenVenta) => v.fk_id_lote === aperturaActual.id_lote);
      cuentasTesoreria = cuentasArr;
      if (ventasLote && ventasLote.length > 0) {
        const totalVentas = ventasLote.filter((v: OrdenVenta) => v.fk_id_tipo_comprobante !== 2).reduce((sum: number, v: OrdenVenta) => sum + v.total, 0);
        const totalNotasCredito = ventasLote.filter((v: OrdenVenta) => v.fk_id_tipo_comprobante === 2).reduce((sum: number, v: OrdenVenta) => sum + Math.abs(v.total), 0);
        const ingresoNeto = totalVentas - totalNotasCredito;
        doc.setFontSize(12);
        doc.text(`Total ventas: $${totalVentas.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, resumenY);
        doc.text(`Total notas de crédito: $${totalNotasCredito.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, resumenY + 8);
        doc.text(`Ingreso neto: $${ingresoNeto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, resumenY + 16);
      }
    }
    // Tabla de resumen
    const tableData = resumen.map(r => [
      r.cuenta,
      `$${r.ingresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${r.egresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    
    autoTable(doc, {
      startY: 120, // Ajustar posición inicial de la tabla
      head: [["Cuenta Tesorería", "Total Ingresos", "Total Egresos"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: "bold"
      },
      styles: {
        fontSize: 10
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" }
      }
    });
    
    // Totales
    const totalIngresos = resumen.reduce((sum, r) => sum + r.ingresos, 0);
    const totalEgresos = resumen.reduce((sum, r) => sum + r.egresos, 0);
    const saldoInicial = parseFloat(aperturaActual?.saldoInicial || '0');
    const saldoFinal = saldoInicial + totalIngresos - totalEgresos;
    
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo inicial: $${saldoInicial.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY);
    doc.text(`Total Ingresos: $${totalIngresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 10);
    doc.text(`Total Egresos: $${totalEgresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 20);
    doc.text(`Saldo Final: $${saldoFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 30);
    
    // --- Tabla de órdenes de venta del lote ---
    if (ventasLote && ventasLote.length > 0) {
      const resumenY2 = finalY + 40;
      doc.setFontSize(14);
      doc.text("Órdenes de venta del lote", 20, resumenY2);
      doc.setFontSize(10);
      const ordenesHead = [
        "ID", "Fecha", "Total", "Subtotal", "Cliente", "Doc", "Usuario", "Comprobante", "Medios de pago"
      ];
      const ordenesBody: any[][] = [];
      for (const orden of ventasLote) {
        const usuarioObj = usuarios.find((u) => u.id === orden.fk_id_usuario);
        const tipoCompObj = cuentasTesoreria.find((t) => t.id === orden.fk_id_tipo_comprobante);
        const medios: OrdenVentaMediosPago[] = await getOrdenesVentaMediosPago(orden.id);
        const mediosStr = medios.map((m) => {
          const cuenta = cuentasTesoreria.find((ct) => ct.id === m.fk_id_cuenta_tesoreria);
          return cuenta ? `${cuenta.descripcion}: $${m.monto_pagado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${m.monto_pagado}`;
        }).join(" | ");
        ordenesBody.push([
          orden.id,
          orden.fecha?.slice(0, 16) || "",
          `$${orden.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${orden.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          "-",
          "-",
          usuarioObj?.nombre || "",
          tipoCompObj?.descripcion || "",
          mediosStr
        ]);
      }
      autoTable(doc, {
        startY: resumenY2,
        head: [ordenesHead],
        body: ordenesBody,
        theme: "grid",
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: "bold"
        },
        styles: {
          fontSize: 8
        }
      });
    }
    // Pie de página
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 280);
    
    // Descargar el PDF
    const fileName = `cierre_caja_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;
    doc.save(fileName);
  }

  // Imprimir cierre de caja para cualquier lote
  async function imprimirCierreDeLote(id_lote: number) {
    // Buscar el lote
    const lotes = await getLotesOperaciones();
    const lote = lotes.find(l => l.id_lote === id_lote);
    if (!lote) return;
    // Buscar caja
    const caja = cajas.find(c => c.id === lote.fk_id_caja);
    // Buscar movimientos
    const movimientos = await getDetalleLotesOperaciones(id_lote);
    // Buscar ventas y medios de pago
    const ventas = await getOrdenesVenta();
    const ventasLote = ventas.filter(v => v.fk_id_lote === id_lote);
    // Obtener catálogos para joins
    const [cuentasTesoreria] = await Promise.all([
      getCuentasTesoreria(),
    ]);
    // Sumar ingresos y egresos por cuenta (movimientos + ventas)
    const resumenPorCuenta: Record<number, { cuenta: string, ingresos: number, egresos: number }> = {};
    for (const cuenta of cuentasTesoreria) {
      resumenPorCuenta[cuenta.id] = { cuenta: cuenta.descripcion, ingresos: 0, egresos: 0 };
    }
    for (const mov of movimientos) {
      if (resumenPorCuenta[mov.fk_id_cuenta_tesoreria]) {
        if (mov.tipo === 'ingreso') {
          resumenPorCuenta[mov.fk_id_cuenta_tesoreria].ingresos += Math.abs(mov.monto);
        } else if (mov.tipo === 'egreso') {
          resumenPorCuenta[mov.fk_id_cuenta_tesoreria].egresos += Math.abs(mov.monto);
        }
      }
    }
    for (const orden of ventasLote) {
      // Eliminadas variables no usadas para evitar error de linter
      if (resumenPorCuenta[orden.fk_id_tipo_comprobante]) { // Usar fk_id_tipo_comprobante como clave
        resumenPorCuenta[orden.fk_id_tipo_comprobante].ingresos += orden.total;
      }
    }
    const resumenFinal = Object.values(resumenPorCuenta);
    // PDF
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("CIERRE DE CAJA", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Caja: ${caja?.descripcion || lote.fk_id_caja}` , 20, 35);
    doc.text(`Saldo inicial: $${parseFloat(lote.saldo_inicial?.toString() || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 45);
    doc.text(`Fecha de apertura: ${lote.fecha_apertura?.slice(0, 10) || "N/A"}`, 20, 55);
    doc.text(`Hora de apertura: ${lote.hora_apertura || "N/A"}`, 20, 65);
    doc.text(`Fecha de cierre: ${lote.fecha_cierre?.slice(0, 10) || "N/A"}`, 20, 75);
    doc.text(`Hora de cierre: ${lote.hora_cierre || "N/A"}`, 20, 85);
    const tableData = resumenFinal.map(r => [
      r.cuenta,
      `$${r.ingresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${r.egresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    autoTable(doc, {
      startY: 100,
      head: [["Cuenta Tesorería", "Total Ingresos", "Total Egresos"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: "bold"
      },
      styles: {
        fontSize: 10
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" }
      }
    });
    const totalIngresos = resumenFinal.reduce((sum, r) => sum + r.ingresos, 0);
    const totalEgresos = resumenFinal.reduce((sum, r) => sum + r.egresos, 0);
    // El saldo inicial ya está incluido en los ingresos, no sumarlo dos veces
    // const saldoInicial = parseFloat(lote.saldo_inicial?.toString() || '0');
    // const saldoFinal = saldoInicial + totalIngresos - totalEgresos;
    const saldoInicial = parseFloat(lote.saldo_inicial?.toString() || '0');
    const saldoFinal = totalIngresos - totalEgresos;
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo inicial: $${saldoInicial.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY);
    doc.text(`Total Ingresos: $${totalIngresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 10);
    doc.text(`Total Egresos: $${totalEgresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 20);
    doc.text(`Saldo Final: $${saldoFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 30);
    // Resumen de órdenes de venta
    let resumenY = finalY + 40;
    doc.setFontSize(14);
    doc.text("Órdenes de venta del lote", 20, resumenY);
    doc.setFontSize(10);
    resumenY += 8;
    const ordenesHead = [
      "ID", "Fecha", "Total", "Subtotal", "Cliente", "Doc", "Usuario", "Comprobante", "Medios de pago"
    ];
    const ordenesBody: any[][] = [];
    for (let i = 0; i < ventasLote.length; i++) {
      const orden = ventasLote[i];
      // Eliminadas variables no usadas para evitar error de linter
    }
    autoTable(doc, {
      startY: resumenY,
      head: [ordenesHead],
      body: ordenesBody,
      theme: "grid",
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: "bold"
      },
      styles: {
        fontSize: 8
      }
      // No columnStyles para dejar que autoTable ajuste el ancho
    });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 280);
    const fileName = `cierre_caja_lote_${id_lote}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;
    doc.save(fileName);
  }

  // Animación de presión y hover para botones
  const pressClass = "active:scale-95 transition-transform duration-100 hover:scale-105 hover:shadow-lg";

  // Mostrar toast de éxito
  function showToast(message: string) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  }

  return (
    <div className="w-full px-8">
      <h1 className="text-2xl font-bold mb-4">Gestión de Caja</h1>
      {/* Formulario de apertura de caja (simulado) */}
      <div className="rounded-lg border bg-card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-2">Apertura de caja</h2>
        {cajaAbierta ? (
          <div className="flex items-center gap-4">
            <span className="text-green-600 font-bold">Caja abierta: {cajaAbierta}</span>
            <button className={`bg-red-600 text-white px-4 py-2 rounded ${pressClass}`} onClick={handleCerrarCaja} disabled={loadingCierre}>
              Cerrar caja
            </button>
          </div>
        ) : (
          <form onSubmit={handleAbrirCaja} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-medium">Caja</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={cajaSeleccionada}
                onChange={e => setCajaSeleccionada(e.target.value)}
                required
              >
                <option value="">Seleccionar caja</option>
                {cajas.map((caja) => (
                  <option key={caja.id} value={caja.descripcion}>{caja.descripcion}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Saldo inicial</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={saldoInicial}
                onChange={e => setSaldoInicial(e.target.value)}
                required
                min={0}
                step="0.01"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Usuario</label>
              <select
                value={usuarioSeleccionado}
                onChange={e => setUsuarioSeleccionado(e.target.value)}
                className="border rounded px-2 py-1"
                required
              >
                <option value="">Selecciona un usuario</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className={`bg-blue-600 text-white px-4 py-2 rounded ${pressClass}`}
              >
                Abrir caja
              </button>
            </div>
            <div className="md:col-span-3">
              <label className="block mb-1 font-medium">Observaciones</label>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[60px]"
                value={observacionesApertura}
                onChange={e => setObservacionesApertura(e.target.value)}
                placeholder="Observaciones de apertura (opcional)"
                maxLength={500}
              />
            </div>
            {aperturaError && <div className="col-span-3 text-red-600 text-sm">{aperturaError}</div>}
          </form>
        )}
        {/* Historial de aperturas/cierres */}
        {historial.length > 0 && (
          <div className="mt-8">
            <h3 className="text-md font-semibold mb-2">Historial de aperturas/cierres</h3>
            <table className="min-w-full text-sm border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">Caja</th>
                  <th className="px-2 py-1">Saldo inicial</th>
                  <th className="px-2 py-1">Fecha apertura</th>
                  <th className="px-2 py-1">Hora apertura</th>
                  <th className="px-2 py-1">Fecha cierre</th>
                  <th className="px-2 py-1">Hora cierre</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{h.caja}</td>
                    <td className="px-2 py-1">{h.saldoInicial}</td>
                    <td className="px-2 py-1">{h.fechaApertura}</td>
                    <td className="px-2 py-1">{h.horaApertura}</td>
                    <td className="px-2 py-1">{h.fechaCierre}</td>
                    <td className="px-2 py-1">{h.horaCierre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <LotesOperacionesContent key={refreshLotes} onImprimirCierre={imprimirCierreDeLote} />
      {showCierreModal && (
        <Dialog open={showCierreModal} onOpenChange={setShowCierreModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Resumen de movimientos del día</DialogTitle>
              <DialogDescription>
                A continuación se listan los ingresos y egresos por tipo de cuenta de tesorería.
              </DialogDescription>
            </DialogHeader>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium">Saldo inicial: ${parseFloat(aperturaActual?.saldoInicial || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <table className="min-w-full text-sm border mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">Cuenta Tesorería</th>
                  <th className="px-2 py-1">Total Ingresos</th>
                  <th className="px-2 py-1">Total Egresos</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{r.cuenta}</td>
                    <td className="px-2 py-1">${r.ingresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-2 py-1">${r.egresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2">
              <button className={`bg-gray-300 px-4 py-2 rounded ${pressClass}`} onClick={() => setShowCierreModal(false)}>Cancelar</button>
              <button className={`bg-blue-600 text-white px-4 py-2 rounded ${pressClass}`} onClick={confirmarCierreCaja}>Confirmar cierre</button>
              <button className={`bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 ${pressClass}`} onClick={generarPDFCierreCaja}>
                <FileText className="h-4 w-4" />
                Imprimir PDF
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-lg animate-fade-in">
          {toast.message}
        </div>
      )}
    </div>
  );
} 