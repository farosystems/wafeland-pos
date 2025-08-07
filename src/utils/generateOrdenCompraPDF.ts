import jsPDF from 'jspdf';
import { OrdenCompra } from '@/types/ordenCompra';
import { getConfiguracionEmpresa } from '@/services/configuracion';

export async function generateOrdenCompraPDF(orden: OrdenCompra): Promise<void> {
  const doc = new jsPDF();
  
  // Obtener configuración de la empresa
  const configEmpresa = await getConfiguracionEmpresa();
  const nombreEmpresa = configEmpresa?.nombre || orden.empresa_nombre || 'Mi Empresa';
  
  // Configuración de colores profesionales
  const primaryColor = [59, 130, 246]; // Azul profesional
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
  doc.text('ORDEN DE COMPRA', 105, 22, { align: 'center' });
  
  // ===== INFORMACIÓN DE LA EMPRESA =====
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreEmpresa, 20, 50);
  
  // Número de orden destacado
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`NÚMERO DE O/C: ${orden.numero_orden}`, 20, 65);
  
  // ===== INFORMACIÓN BÁSICA DE LA ORDEN =====
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Fecha de la orden
  doc.text('Fecha de O/C:', 120, 50);
  doc.text(orden.fecha, 120, 60);
  
  // Proveedor
  doc.text('Proveedor:', 120, 70);
  doc.text(orden.proveedor_razon_social || 'Proveedor', 120, 80);
  
  // ===== TABLA DE PRODUCTOS =====
  const productsY = 90;
  
  // Fondo azul para el encabezado de productos
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(20, productsY - 5, 170, 8, 'F');
  
  // Encabezados de productos en blanco
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const productHeaders = ['CANTIDAD', 'UNIDAD', 'DESCRIPCIÓN', 'PRECIO UNITARIO', 'TOTAL'];
  const productWidths = [20, 20, 60, 35, 30];
  let productX = 20;
  
  productHeaders.forEach((header, index) => {
    doc.text(header, productX + 2, productsY);
    productX += productWidths[index];
  });
  
  // Línea separadora
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(20, productsY + 3, 190, productsY + 3);
  
  // Productos
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let currentProductY = productsY + 12;
  
  if (orden.items && orden.items.length > 0) {
    orden.items.forEach((item) => {
      if (currentProductY < 250) { // Evitar que se salga de la página
        productX = 20;
        
        doc.text(item.cantidad.toString(), productX + 2, currentProductY);
        productX += productWidths[0];
        
        doc.text('UN', productX + 2, currentProductY);
        productX += productWidths[1];
        
        const descripcion = `${item.articulo_descripcion || 'Artículo'} - ${item.talle_descripcion || ''} - ${item.color_descripcion || ''}`;
        doc.text(descripcion.substring(0, 30), productX + 2, currentProductY);
        productX += productWidths[2];
        
        doc.text(`$${item.precio_unitario.toFixed(2)}`, productX + 2, currentProductY);
        productX += productWidths[3];
        
        doc.text(`$${item.subtotal.toFixed(2)}`, productX + 2, currentProductY);
        
        currentProductY += 8;
      }
    });
  }
  
  // Línea final de productos
  doc.line(20, currentProductY, 190, currentProductY);
  
  // ===== RESUMEN FINANCIERO =====
  const summaryY = Math.max(currentProductY + 20, 200);
  
  // Borde alrededor del resumen financiero - Aumentar altura significativamente
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(120, summaryY - 10, 70, 120);
  
  // Título del resumen
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(120, summaryY - 10, 70, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO', 155, summaryY - 5, { align: 'center' });
  
  // Resumen financiero - Ajustar posiciones para que quepa todo
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const summaryX = 125;
  let summaryCurrentY = summaryY + 8;
  
  doc.text('SUBTOTAL:', summaryX, summaryCurrentY);
  doc.text(`$${orden.subtotal.toFixed(2)}`, summaryX + 40, summaryCurrentY);
  summaryCurrentY += 15;
  
  if (orden.descuento_porcentaje > 0) {
    doc.text('DESCUENTO:', summaryX, summaryCurrentY);
    doc.text(`-$${(orden.subtotal - orden.subtotal_menos_descuento).toFixed(2)}`, summaryX + 40, summaryCurrentY);
    summaryCurrentY += 15;
  }
  
  doc.text('IMPUESTOS:', summaryX, summaryCurrentY);
  doc.text(`$${orden.total_impuestos.toFixed(2)}`, summaryX + 40, summaryCurrentY);
  summaryCurrentY += 15;
  
  if (orden.envio_almacenaje > 0) {
    doc.text('ENVÍO:', summaryX, summaryCurrentY);
    doc.text(`$${orden.envio_almacenaje.toFixed(2)}`, summaryX + 40, summaryCurrentY);
    summaryCurrentY += 15;
  }
  
  // Línea separadora antes del total
  doc.line(summaryX, summaryCurrentY + 3, summaryX + 60, summaryCurrentY + 3);
  summaryCurrentY += 10;
  
  // Total destacado - Asegurar que esté dentro del rectángulo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TOTAL:', summaryX, summaryCurrentY);
  doc.text(`$${orden.total.toFixed(2)}`, summaryX + 40, summaryCurrentY);
  
  // ===== INSTRUCCIONES =====
  const instructionsY = summaryY;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Instrucciones:', 20, instructionsY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Envíe dos copias de la factura.', 20, instructionsY + 12);
  doc.text('2. Ingrese este pedido de acuerdo con los precios y', 20, instructionsY + 20);
  doc.text('   condiciones especificadas.', 20, instructionsY + 28);
  doc.text('3. Notifiquenos inmediatamente si no puede realizar', 20, instructionsY + 36);
  doc.text('   el envío como se especificó.', 20, instructionsY + 44);
  
  // ===== FIRMA =====
  const signatureY = summaryY + 60;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Autorizado por:', 20, signatureY);
  doc.line(20, signatureY + 5, 80, signatureY + 5);
  
  doc.text('Fecha:', 20, signatureY + 15);
  doc.line(20, signatureY + 20, 80, signatureY + 20);
  
  // ===== NOTAS ADICIONALES =====
  if (orden.notas) {
    const notesY = signatureY + 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notas / Observaciones:', 20, notesY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(orden.notas, 20, notesY + 8);
  }
  
  // Guardar el PDF
  doc.save(`orden-compra-${orden.numero_orden}.pdf`);
} 