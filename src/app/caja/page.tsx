"use client";
import React, { useEffect, useState } from "react";
import { getCajas, createCaja, updateCaja, deleteCaja } from "@/services/cajas";
import { Caja } from "@/types/caja";
import { format } from "date-fns";
import { createLoteOperacion } from "@/services/lotesOperaciones";
import { createDetalleLoteOperacion } from "@/services/detalleLotesOperaciones";
import { LotesOperacionesContent } from "@/components/lotes-operaciones-content";
import { getLoteCajaAbiertaPorUsuario, cerrarLoteApertura } from "@/services/lotesOperaciones";
import { getDetalleLotesOperaciones } from "@/services/detalleLotesOperaciones";
import { DetalleLoteOperacion } from "@/types/loteOperacion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CuentasTesoreriaContent } from "@/components/caja/cuentas-tesoreria-content";
import { Edit, Trash2, FileText } from "lucide-react";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { getOrdenesVenta } from "@/services/ordenesVenta";
import { getOrdenesVentaMediosPago } from "@/services/ordenesVentaMediosPago";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AperturaCaja {
  caja: string;
  saldoInicial: string;
  fechaApertura: string;
  horaApertura: string;
  fechaCierre: string | null;
  horaCierre: string | null;
  id_lote?: number;
}

const TURNOS = [
  { label: "Mañana", value: "mañana" },
  { label: "Tarde", value: "tarde" },
  { label: "Noche", value: "noche" },
];

function nowDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function nowTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}

export default function CajaPage() {
  // Formulario de apertura de caja (simulado)
  const [cajaSeleccionada, setCajaSeleccionada] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [cajaAbierta, setCajaAbierta] = useState<string | null>(null);
  const [aperturaError, setAperturaError] = useState<string | null>(null);

  // CRUD de cajas de turno
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(false);
  const [crudError, setCrudError] = useState<string | null>(null);
  const [editCaja, setEditCaja] = useState<Caja | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [turno, setTurno] = useState("");

  // Simulación de historial de aperturas/cierres
  const [historial, setHistorial] = useState<any[]>([]);
  const [aperturaActual, setAperturaActual] = useState<AperturaCaja | null>(null);

  // Ref para refrescar lotes
  const [refreshLotes, setRefreshLotes] = useState(0);

  const [showCierreModal, setShowCierreModal] = useState(false);
  const [movimientos, setMovimientos] = useState<DetalleLoteOperacion[]>([]);
  const [resumen, setResumen] = useState<{ cuenta: string, ingresos: number, egresos: number }[]>([]);
  const [loadingCierre, setLoadingCierre] = useState(false);
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);

  useEffect(() => {
    fetchCajas();
    fetchCajaAbierta();
    getCuentasTesoreria().then(setCuentasTesoreria);
  }, []);

  async function fetchCajaAbierta() {
    // Por ahora usuario id 1
    const lote = await getLoteCajaAbiertaPorUsuario(1);
    if (lote) {
      setCajaAbierta(lote.fk_id_caja);
      setAperturaActual({
        caja: cajas.find(c => c.id === lote.fk_id_caja)?.descripcion || lote.fk_id_caja,
        saldoInicial: '', // Si quieres puedes guardar el saldo en el lote o buscarlo en el detalle
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
  }

  const fetchCajas = async () => {
    setLoading(true);
    setCrudError(null);
    try {
      const data = await getCajas();
      setCajas(data);
    } catch (err: any) {
      setCrudError("Error al cargar cajas");
    } finally {
      setLoading(false);
    }
  };

  // --- Apertura de caja (simulado, en el futuro irá a otra tabla) ---
  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setAperturaError(null);
    if (!cajaSeleccionada || !saldoInicial) {
      setAperturaError("Selecciona una caja y saldo inicial");
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
    });
    setCajaSeleccionada("");
    setSaldoInicial("");

    // --- Lógica de lotes de operaciones ---
    try {
      // Buscar la caja por descripción
      const cajaObj = cajas.find(c => c.descripcion === cajaSeleccionada);
      if (!cajaObj) return;
      // Crear lote de apertura
      const lote = await createLoteOperacion({
        fk_id_usuario: 1, // usuario prueba
        fk_id_caja: cajaObj.id,
        abierto: true,
        tipo_lote: "apertura",
        fecha_apertura: hoy,
        hora_apertura: format(now, "HH:mm"),
        fecha_cierre: hoy, // se actualiza al cerrar
        hora_cierre: null,
        observaciones: null,
      });
      // Crear detalle del lote
      await createDetalleLoteOperacion({
        fk_id_lote: lote.id_lote,
        fk_id_cuenta_tesoreria: 1, // cuenta prueba
        tipo: 'ingreso',
        monto: parseFloat(saldoInicial),
      });
      setRefreshLotes(x => x + 1);
    } catch (err) {
      // Silenciar error para no romper UI simulada
    }
    await fetchCajaAbierta();
  };

  async function handleCerrarCaja() {
    if (!aperturaActual || !aperturaActual.id_lote) return;
    setLoadingCierre(true);
    // Traer todas las ventas del lote abierto
    const ventas = await getOrdenesVenta();
    const ventasLote = ventas.filter(v => v.fk_id_lote === aperturaActual.id_lote);
    // Traer todos los medios de pago de esas ventas
    let pagosPorCuenta: Record<number, number> = {};
    for (const cuenta of cuentasTesoreria) {
      pagosPorCuenta[cuenta.id] = 0;
    }
    for (const venta of ventasLote) {
      const medios = await getOrdenesVentaMediosPago(venta.id);
      for (const m of medios) {
        if (pagosPorCuenta[m.fk_id_cuenta_tesoreria] === undefined) pagosPorCuenta[m.fk_id_cuenta_tesoreria] = 0;
        pagosPorCuenta[m.fk_id_cuenta_tesoreria] += m.monto_pagado;
      }
    }
    // Armar resumen para todas las cuentas
    const resumenFinal = cuentasTesoreria.map(cuenta => ({
      cuenta: cuenta.descripcion,
      ingresos: pagosPorCuenta[cuenta.id] || 0,
      egresos: 0,
    }));
    setResumen(resumenFinal);
    setShowCierreModal(true);
    setLoadingCierre(false);
  }

  async function confirmarCierreCaja() {
    setShowCierreModal(false);
    if (!aperturaActual || !aperturaActual.id_lote) return;
    setLoadingCierre(true);
    const now = new Date();
    const hoyCierre = format(now, "yyyy-MM-dd");
    await cerrarLoteApertura(aperturaActual.id_lote, hoyCierre, format(now, "HH:mm"));
    setCajaAbierta(null);
    setAperturaActual(null);
    setLoadingCierre(false);
  }

  function generarPDFCierreCaja() {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text("CIERRE DE CAJA", 105, 20, { align: "center" });
    
    // Información de la caja
    doc.setFontSize(12);
    doc.text(`Caja: ${aperturaActual?.caja || "N/A"}`, 20, 35);
    doc.text(`Fecha de apertura: ${aperturaActual?.fechaApertura || "N/A"}`, 20, 45);
    doc.text(`Hora de apertura: ${aperturaActual?.horaApertura || "N/A"}`, 20, 55);
    doc.text(`Fecha de cierre: ${format(new Date(), "yyyy-MM-dd")}`, 20, 65);
    doc.text(`Hora de cierre: ${format(new Date(), "HH:mm")}`, 20, 75);
    
    // Tabla de resumen
    const tableData = resumen.map(r => [
      r.cuenta,
      `$${r.ingresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `$${r.egresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);
    
    autoTable(doc, {
      startY: 90,
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
    const saldoFinal = totalIngresos - totalEgresos;
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Ingresos: $${totalIngresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY);
    doc.text(`Total Egresos: $${totalEgresos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 10);
    doc.text(`Saldo Final: $${saldoFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, finalY + 20);
    
    // Pie de página
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 280);
    
    // Descargar el PDF
    const fileName = `cierre_caja_${format(new Date(), "yyyy-MM-dd_HH-mm")}.pdf`;
    doc.save(fileName);
  }

  // --- CRUD de cajas de turno ---
  const handleCreateCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudError(null);
    if (!descripcion || !turno) {
      setCrudError("Completa todos los campos");
      return;
    }
    if (cajas.length >= 3) {
      setCrudError("Solo puede haber 3 cajas (día, tarde, noche)");
      return;
    }
    if (cajas.some(c => c.turno === turno)) {
      setCrudError("Ya existe una caja para ese turno");
      return;
    }
    setLoading(true);
    try {
      await createCaja({ descripcion, turno });
      setDescripcion("");
      setTurno("");
      await fetchCajas();
    } catch (err: any) {
      setCrudError("Error al crear caja");
    } finally {
      setLoading(false);
    }
  };
  const handleEditCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudError(null);
    if (!editCaja) return;
    setLoading(true);
    try {
      await updateCaja(editCaja.id, { descripcion: editCaja.descripcion, turno: editCaja.turno });
      setEditCaja(null);
      await fetchCajas();
    } catch (err: any) {
      setCrudError("Error al editar caja");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteCaja = async (id: number) => {
    if (!window.confirm("¿Eliminar esta caja?")) return;
    setLoading(true);
    setCrudError(null);
    try {
      await deleteCaja(id);
      await fetchCajas();
    } catch (err: any) {
      setCrudError("Error al eliminar caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Gestión de Caja</h1>
      {/* Formulario de apertura de caja (simulado) */}
      <div className="rounded-lg border bg-card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-2">Apertura de caja</h2>
        {cajaAbierta ? (
          <div className="flex items-center gap-4">
            <span className="text-green-600 font-bold">Caja abierta: {cajaAbierta}</span>
            <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleCerrarCaja} disabled={loadingCierre}>
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
            <div className="flex items-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Abrir caja
              </button>
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
      {/* CRUD de cajas de turno */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Cajas de turnos</h2>
        {/* Formulario crear/editar caja de turno */}
        <div className="mb-4">
          {editCaja ? (
            <form onSubmit={handleEditCaja} className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block mb-1 font-medium">Descripción</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={editCaja.descripcion}
                  onChange={e => setEditCaja({ ...editCaja, descripcion: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Turno</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={editCaja.turno}
                  onChange={e => setEditCaja({ ...editCaja, turno: e.target.value })}
                  required
                >
                  <option value="">Seleccionar turno</option>
                  {TURNOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Guardar</button>
              <button type="button" className="ml-2 px-4 py-2 rounded border border-gray-300" onClick={() => setEditCaja(null)}>Cancelar</button>
            </form>
          ) : (
            <form onSubmit={handleCreateCaja} className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block mb-1 font-medium">Descripción</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Turno</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={turno}
                  onChange={e => setTurno(e.target.value)}
                  required
                >
                  <option value="">Seleccionar turno</option>
                  {TURNOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Agregar</button>
            </form>
          )}
          {crudError && <div className="text-red-600 text-sm mt-2">{crudError}</div>}
        </div>
        {/* Tabla de cajas de turno */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Descripción</th>
                <th className="px-4 py-2 text-left">Turno</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cajas.map((caja) => (
                <tr key={caja.id} className="border-b">
                  <td className="px-4 py-2">{caja.id}</td>
                  <td className="px-4 py-2">{caja.descripcion}</td>
                  <td className="px-4 py-2">{caja.turno}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800 p-1"
                      onClick={() => setEditCaja(caja)}
                      disabled={loading}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800 p-1 ml-2"
                      onClick={() => handleDeleteCaja(caja.id)}
                      disabled={loading}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {cajas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted-foreground">No hay cajas registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <LotesOperacionesContent key={refreshLotes} />
      {showCierreModal && (
        <Dialog open={showCierreModal} onOpenChange={setShowCierreModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Resumen de movimientos del día</DialogTitle>
              <DialogDescription>
                A continuación se listan los ingresos y egresos por tipo de cuenta de tesorería.
              </DialogDescription>
            </DialogHeader>
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
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowCierreModal(false)}>Cancelar</button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={confirmarCierreCaja}>Confirmar cierre</button>
              <button className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2" onClick={generarPDFCierreCaja}>
                <FileText className="h-4 w-4" />
                Imprimir PDF
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <div className="mt-10">
        <CuentasTesoreriaContent />
      </div>
    </div>
  );
} 