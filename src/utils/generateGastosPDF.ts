import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@/lib/utils';
import { getGastosPorLote } from '@/services/gastosEmpleados';

interface GastoConRelaciones {
  id: number;
  creado_el: string;
  monto: number;
  descripcion: string | null;
  fk_lote_operaciones: number;
  tipo_gasto: {
    id: number;
    descripcion: string;
  };
  empleado: {
    id: number;
    nombre: string;
    apellido: string;
  } | null;
  usuario: {
    id: number;
    nombre: string;
  } | null;
  cuenta_tesoreria: {
    id: number;
    descripcion: string;
  } | null;
}

export async function generateGastosPDF(idLote: number, fechaApertura: string, fechaCierre: string, cajaDescripcion: string): Promise<void> {
  // Obtener los gastos del lote
  const gastos = await getGastosPorLote(idLote) as GastoConRelaciones[];
  
  const doc = new jsPDF();
  
  // Configuración de colores profesionales
  const primaryColor = [59, 130, 246]; // Azul profesional
  const secondaryColor = [107, 114, 128]; // Gris
  const textColor = [31, 41, 55]; // Gris oscuro
  
  // Configuración de fuentes
  doc.setFont('helvetica');
  
  // ===== ENCABEZADO =====
  // Fondo azul para el encabezado
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 35, 'F');
  
  // Título principal en blanco
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE GASTOS', 105, 22, { align: 'center' });
  
  // ===== INFORMACIÓN DEL LOTE =====
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  let y = 50;
  doc.text(`Caja: ${cajaDescripcion}`, 20, y);
  doc.text(`Lote: ${idLote}`, 120, y);
  y += 8;
  doc.text(`Fecha de apertura: ${fechaApertura}`, 20, y);
  doc.text(`Fecha de cierre: ${fechaCierre}`, 120, y);
  y += 8;
  doc.text(`Total de gastos: ${gastos.length}`, 20, y);
  y += 15;
  
  // ===== RESUMEN DE GASTOS POR TIPO =====
  if (gastos.length > 0) {
    // Agrupar gastos por tipo
    const gastosPorTipo = gastos.reduce((acc, gasto) => {
      const tipo = gasto.tipo_gasto?.descripcion || 'Sin tipo';
      if (!acc[tipo]) {
        acc[tipo] = { total: 0, cantidad: 0 };
      }
      acc[tipo].total += gasto.monto;
      acc[tipo].cantidad += 1;
      return acc;
    }, {} as Record<string, { total: number; cantidad: number }>);
    
    // Tabla de resumen por tipo
    const resumenData = Object.entries(gastosPorTipo).map(([tipo, datos]) => [
      tipo,
      datos.cantidad.toString(),
      formatCurrency(datos.total, DEFAULT_CURRENCY, DEFAULT_LOCALE)
    ]);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de gastos por tipo', 20, y);
    y += 8;
    
    autoTable(doc, {
      startY: y,
      head: [['Tipo de Gasto', 'Cantidad', 'Total']],
      body: resumenData,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' }
      }
    });
    
    y = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // ===== TABLA DETALLADA DE GASTOS =====
  if (gastos.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de gastos', 20, y);
    y += 8;
    
    const gastosData = gastos.map(gasto => [
      gasto.id.toString(),
      new Date(gasto.creado_el).toLocaleDateString('es-ES'),
      gasto.tipo_gasto?.descripcion || '-',
      gasto.empleado ? `${gasto.empleado.nombre} ${gasto.empleado.apellido}` : '-',
      gasto.descripcion || '-',
      gasto.cuenta_tesoreria?.descripcion || '-',
      formatCurrency(gasto.monto, DEFAULT_CURRENCY, DEFAULT_LOCALE)
    ]);
    
    autoTable(doc, {
      startY: y,
      head: [['ID', 'Fecha', 'Tipo', 'Empleado', 'Descripción', 'Cuenta', 'Monto']],
      body: gastosData,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8
      },
      columnStyles: {
        6: { halign: 'right' }
      }
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // ===== TOTALES =====
  const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total general de gastos: ${formatCurrency(totalGastos, DEFAULT_CURRENCY, DEFAULT_LOCALE)}`, 20, y);
  
  // ===== PIE DE PÁGINA =====
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 280);
  
  // Descargar el PDF
  const fileName = `reporte_gastos_lote_${idLote}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
  doc.save(fileName);
} 