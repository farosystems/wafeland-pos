"use client";

import { useState, useEffect } from "react";
import { getLiquidaciones } from "@/services/liquidaciones";
import { Liquidacion } from "@/types/liquidacion";
import { getEmpleados } from "@/services/empleados";
import { Empleado } from "@/types/empleado";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function LiquidacionesTable() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [liquidacionesData, empleadosData] = await Promise.all([
          getLiquidaciones(),
          getEmpleados(),
        ]);
        setLiquidaciones(liquidacionesData);
        setEmpleados(empleadosData);
      } catch (error) {
        console.error("Error al cargar datos:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getEmpleadoNombre = (id: number) => {
    return empleados.find(e => e.id === id)?.nombre || "N/A";
  };

  const generarPDF = (liquidacion: Liquidacion) => {
    const empleado = empleados.find(e => e.id === liquidacion.fk_empleado);
    if (!empleado) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Recibo de Sueldo", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Empleado: ${empleado.nombre}`, 20, 40);
    doc.text(`Período: ${format(new Date(liquidacion.desde), 'dd/MM/yyyy')} - ${format(new Date(liquidacion.hasta), 'dd/MM/yyyy')}`, 20, 50);
    doc.text(`Fecha de liquidación: ${format(new Date(liquidacion.creado_el), 'dd/MM/yyyy')}`, 20, 60);

    autoTable(doc, {
      startY: 70,
      head: [['Concepto', 'Monto']],
      body: [
        ['Sueldo Base', formatCurrency(liquidacion.sueldo_base)],
        ['Adelantos (-)', formatCurrency(liquidacion.total_adelantos)],
        ['Faltas (-)', formatCurrency(liquidacion.total_faltas)],
      ],
      theme: 'striped',
      styles: { fontSize: 12 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      didDrawPage: (hookData) => {
        if (hookData.cursor) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('Neto a Pagar:', 20, hookData.cursor.y + 10);
          doc.text(formatCurrency(liquidacion.neto_liquidado), 190, hookData.cursor.y + 10, { align: 'right' });
        }
      }
    });

    doc.save(`liquidacion_${empleado.nombre}_${format(new Date(liquidacion.desde), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-lg font-semibold mb-4">Historial de Liquidaciones</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">ID</th>
              <th className="px-2 py-1 text-left">Empleado</th>
              <th className="px-2 py-1 text-left">Período</th>
              <th className="px-2 py-1 text-right">Sueldo Base</th>
              <th className="px-2 py-1 text-right">Adelantos</th>
              <th className="px-2 py-1 text-right">Faltas</th>
              <th className="px-2 py-1 text-right">Neto a Pagar</th>
              <th className="px-2 py-1 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {liquidaciones.map(liq => (
              <tr key={liq.id} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1">{liq.id}</td>
                <td className="px-2 py-1">{getEmpleadoNombre(liq.fk_empleado)}</td>
                <td className="px-2 py-1">
                  {format(new Date(liq.desde), 'dd/MM/yy')} - {format(new Date(liq.hasta), 'dd/MM/yy')}
                </td>
                <td className="px-2 py-1 text-right">{formatCurrency(liq.sueldo_base)}</td>
                <td className="px-2 py-1 text-right text-red-500">{formatCurrency(liq.total_adelantos)}</td>
                <td className="px-2 py-1 text-right text-red-500">{formatCurrency(liq.total_faltas)}</td>
                <td className="px-2 py-1 text-right font-bold">{formatCurrency(liq.neto_liquidado)}</td>
                <td className="px-2 py-1 text-center">
                  <Button size="sm" variant="outline" onClick={() => generarPDF(liq)}>Ver PDF</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 