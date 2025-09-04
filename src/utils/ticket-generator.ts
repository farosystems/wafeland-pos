import jsPDF from 'jspdf';
import { Mesa, DetallePedidoMesa } from '@/types/mesa';
import { getConfiguracionEmpresa } from '@/services/configuracion';

interface TicketData {
  ordenId: number;
  mesa: Mesa;
  detallePedidos: DetallePedidoMesa[];
  total: number;
  fecha: Date;
  medioPago?: string;
}

export async function generarTicketPDF(ticketData: TicketData) {
  const { ordenId, mesa, detallePedidos, total, fecha, medioPago = 'Efectivo' } = ticketData;

  // Obtener configuración de la empresa
  const configuracion = await getConfiguracionEmpresa();
  
  // Crear documento PDF en formato ticket (58mm de ancho)
  const doc = new jsPDF({
    unit: 'mm',
    format: [58, 200], // 58mm de ancho, altura variable
    orientation: 'portrait'
  });

  let yPosition = 3;
  const lineHeight = 3;
  const pageWidth = 58;
  const margin = 2;
  const contentWidth = pageWidth - (margin * 2);

  // Función para agregar texto centrado
  const addCenteredText = (text: string, y: number, fontSize: number = 8, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('courier', isBold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
    return y + lineHeight;
  };

  // Función para agregar texto justificado
  const addJustifiedText = (leftText: string, rightText: string, y: number, fontSize: number = 7, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('courier', isBold ? 'bold' : 'normal');
    
    const rightTextWidth = doc.getTextWidth(rightText);
    
    doc.text(leftText.toUpperCase(), margin, y);
    doc.text(rightText, pageWidth - margin - rightTextWidth, y);
    
    return y + lineHeight;
  };

  // Función para agregar línea separadora sólida
  const addSeparator = (y: number) => {
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    return y + 2;
  };

  // Función para agregar línea separadora punteada
  const addDottedSeparator = (y: number) => {
    doc.setLineWidth(0.2);
    // Crear línea punteada manualmente
    for (let x = margin; x < pageWidth - margin; x += 2) {
      doc.line(x, y, x + 1, y);
    }
    return y + 2;
  };

  // Función para agregar borde del ticket
  const addBorder = () => {
    doc.setLineWidth(0.5);
    doc.rect(1, 1, pageWidth - 2, yPosition + 8);
  };

  // HEADER con bordes
  doc.setLineWidth(0.5);
  yPosition += 2;

  yPosition = addCenteredText(
    configuracion?.nombre || 'CAFETERÍA', 
    yPosition, 
    11, 
    true
  );

  yPosition = addCenteredText('COMPROBANTE DE VENTA', yPosition, 9, true);
  yPosition = addSeparator(yPosition);

  // Información del ticket
  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const horaFormateada = fecha.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  yPosition = addJustifiedText('FECHA:', fechaFormateada, yPosition, 7, true);
  yPosition = addJustifiedText('HORA:', horaFormateada, yPosition, 7, true);
  yPosition = addJustifiedText('TICKET N°:', ordenId.toString().padStart(6, '0'), yPosition, 7, true);
  yPosition = addJustifiedText('MESA:', mesa.numero, yPosition, 7, true);
  
  yPosition = addDottedSeparator(yPosition);

  // Header de productos
  yPosition = addCenteredText('DETALLE DE CONSUMO', yPosition, 8, true);
  yPosition = addSeparator(yPosition);

  // Productos
  doc.setFont('courier', 'normal');
  let subtotal = 0;

  detallePedidos.forEach((detalle) => {
    // Nombre del producto
    const nombreProducto = detalle.articulo_descripcion?.toUpperCase() || 'PRODUCTO';
    doc.setFontSize(7);
    doc.setFont('courier', 'bold');
    
    // Si el nombre es muy largo, dividirlo
    const maxWidth = 50;
    const lines = doc.splitTextToSize(nombreProducto, maxWidth);
    
    lines.forEach((line: string) => {
      doc.text(line, margin, yPosition);
      yPosition += 2.5;
    });

    // Línea con cantidad, precio unitario y subtotal
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const qtyPriceText = `${detalle.cantidad.toString().padStart(2, ' ')} x $${detalle.precio_unitario.toLocaleString('es-AR')}`;
    const subtotalText = `$${detalle.subtotal.toLocaleString('es-AR')}`;
    
    doc.text(qtyPriceText, margin, yPosition);
    const subtotalWidth = doc.getTextWidth(subtotalText);
    doc.text(subtotalText, pageWidth - margin - subtotalWidth, yPosition);
    yPosition += 3;

    // Observaciones del producto si las hay
    if (detalle.observaciones) {
      doc.setFontSize(6);
      doc.setFont('courier', 'italic');
      const obsText = `Obs: ${detalle.observaciones}`;
      const obsLines = doc.splitTextToSize(obsText, contentWidth - 4);
      obsLines.forEach((line: string) => {
        doc.text(line, margin + 2, yPosition);
        yPosition += 2.5;
      });
      doc.setFont('courier', 'normal');
    }

    // Separador punteado entre productos
    yPosition = addDottedSeparator(yPosition);
    subtotal += detalle.subtotal;
  });

  yPosition = addSeparator(yPosition);

  // Totales
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  yPosition = addJustifiedText('SUBTOTAL:', `$${subtotal.toLocaleString('es-AR')}`, yPosition, 7, true);
  yPosition = addJustifiedText('DESC./REC.:', '$0.00', yPosition, 7, true);
  yPosition = addJustifiedText('IMPUESTOS:', '$0.00', yPosition, 7, true);
  
  yPosition = addSeparator(yPosition);
  
  // Total final con doble línea
  doc.setLineWidth(0.5);
  doc.rect(margin, yPosition, contentWidth, 6);
  doc.setFont('courier', 'bold');
  yPosition += 4;
  yPosition = addJustifiedText('TOTAL A PAGAR:', `$${total.toLocaleString('es-AR')}`, yPosition, 9, true);
  
  yPosition += 3;
  yPosition = addSeparator(yPosition);

  // Información de pago
  doc.setLineWidth(0.3);
  doc.rect(margin, yPosition, contentWidth, 8);
  yPosition += 3;
  yPosition = addCenteredText(`FORMA DE PAGO: ${medioPago.toUpperCase()}`, yPosition, 7, true);
  yPosition = addCenteredText('CONSUMIDOR FINAL', yPosition, 7, false);
  yPosition += 3;

  yPosition = addSeparator(yPosition);
  yPosition = addSeparator(yPosition);

  // Footer
  yPosition += 2;
  yPosition = addCenteredText('¡GRACIAS POR SU VISITA!', yPosition, 8, true);
  
  yPosition += 4;
  doc.setFontSize(5);
  doc.setFont('courier', 'normal');
  yPosition = addCenteredText('Sistema Faro POS - FAROAI', yPosition, 5);
  yPosition = addCenteredText('www.faroai.com', yPosition, 5);
  
  // Agregar borde completo del ticket
  addBorder();
  
  // Ajustar altura del PDF según el contenido
  const finalHeight = Math.max(yPosition + 15, 120);
  doc.internal.pageSize.height = finalHeight;

  // Descargar el PDF
  const fileName = `ticket-mesa-${mesa.numero}-${ordenId.toString().padStart(6, '0')}-${fechaFormateada.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
  
  return doc;
}

// Función para generar ticket HTML para imprimir (alternativa más compatible)
export function generarTicketHTML(ticketData: TicketData): string {
  const { ordenId, mesa, detallePedidos, total, fecha, medioPago = 'Efectivo' } = ticketData;
  
  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const horaFormateada = fecha.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const subtotal = detallePedidos.reduce((sum, d) => sum + d.subtotal, 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket Mesa ${mesa.numero}</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 2mm;
        }
        
        @media print {
          body { 
            margin: 0;
            padding: 0;
            background: white;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .no-print { display: none; }
          .ticket-container {
            border: 1px solid #000 !important;
          }
        }
        
        body {
          font-family: 'Courier New', 'Monaco', 'Lucida Console', monospace;
          font-size: 9px;
          line-height: 1.1;
          margin: 0;
          padding: 0;
          background: white;
          color: #000;
        }
        
        .ticket-container {
          width: 54mm;
          max-width: 54mm;
          margin: 0 auto;
          padding: 2mm;
          background: white;
          border: 1px solid #000;
          box-sizing: border-box;
        }
        
        .header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 1px solid #000;
          padding-bottom: 4px;
        }
        
        .company-name {
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .ticket-title {
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 2px;
          text-decoration: underline;
        }
        
        .separator-line {
          width: 100%;
          height: 1px;
          background: repeating-linear-gradient(
            to right,
            #000,
            #000 2px,
            transparent 2px,
            transparent 4px
          );
          margin: 4px 0;
        }
        
        .separator-double {
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          height: 3px;
          margin: 6px 0;
        }
        
        .info-section {
          margin-bottom: 8px;
          font-size: 8px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1px;
          font-weight: normal;
        }
        
        .info-label {
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .products-header {
          font-size: 8px;
          font-weight: bold;
          text-align: center;
          margin: 6px 0 4px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .products-section {
          margin-bottom: 8px;
          border-top: 1px solid #000;
          padding-top: 4px;
        }
        
        .product-item {
          margin-bottom: 6px;
          border-bottom: 1px dotted #666;
          padding-bottom: 3px;
        }
        
        .product-name {
          font-weight: bold;
          font-size: 9px;
          margin-bottom: 2px;
          text-transform: uppercase;
          word-wrap: break-word;
        }
        
        .product-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 8px;
        }
        
        .product-qty-price {
          font-family: 'Courier New', monospace;
        }
        
        .product-total {
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }
        
        .product-obs {
          font-size: 7px;
          font-style: italic;
          color: #444;
          margin-top: 2px;
          margin-left: 4px;
          border-left: 1px solid #ccc;
          padding-left: 4px;
        }
        
        .totals-section {
          border-top: 1px solid #000;
          padding-top: 4px;
          margin-bottom: 8px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
          font-size: 8px;
          font-family: 'Courier New', monospace;
        }
        
        .total-label {
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .total-value {
          font-weight: bold;
        }
        
        .final-total {
          border: 2px solid #000;
          padding: 3px;
          margin: 6px 0;
          background: #f8f8f8;
        }
        
        .final-total .total-row {
          font-size: 11px;
          font-weight: bold;
        }
        
        .payment-info {
          text-align: center;
          margin: 8px 0;
          font-size: 8px;
          border: 1px solid #000;
          padding: 4px;
        }
        
        .payment-method {
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        
        .customer-type {
          font-style: italic;
        }
        
        .footer-message {
          text-align: center;
          margin: 8px 0;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .system-info {
          text-align: center;
          margin-top: 8px;
          font-size: 6px;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 4px;
        }
        
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <!-- HEADER -->
        <div class="header">
          <div class="company-name">CAFETERÍA</div>
          <div class="ticket-title">COMPROBANTE DE VENTA</div>
        </div>

        <!-- INFO SECTION -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Fecha:</span>
            <span>${fechaFormateada}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Hora:</span>
            <span>${horaFormateada}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ticket N°:</span>
            <span>${ordenId.toString().padStart(6, '0')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mesa:</span>
            <span>${mesa.numero}</span>
          </div>
        </div>

        <div class="separator-line"></div>

        <!-- PRODUCTS SECTION -->
        <div class="products-header">Detalle de Consumo</div>
        <div class="products-section">
          ${detallePedidos.map(detalle => `
            <div class="product-item">
              <div class="product-name">${detalle.articulo_descripcion}</div>
              <div class="product-line">
                <span class="product-qty-price">${detalle.cantidad.toString().padStart(2, ' ')} x $${detalle.precio_unitario.toLocaleString('es-AR')}</span>
                <span class="product-total">$${detalle.subtotal.toLocaleString('es-AR')}</span>
              </div>
              ${detalle.observaciones ? `<div class="product-obs">Obs: ${detalle.observaciones}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <!-- TOTALS SECTION -->
        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">$${subtotal.toLocaleString('es-AR')}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Desc./Rec.:</span>
            <span class="total-value">$0.00</span>
          </div>
          <div class="total-row">
            <span class="total-label">Impuestos:</span>
            <span class="total-value">$0.00</span>
          </div>
        </div>

        <div class="final-total">
          <div class="total-row">
            <span class="total-label">TOTAL A PAGAR:</span>
            <span class="total-value">$${total.toLocaleString('es-AR')}</span>
          </div>
        </div>

        <!-- PAYMENT INFO -->
        <div class="payment-info">
          <div class="payment-method">Forma de Pago: ${medioPago.toUpperCase()}</div>
          <div class="customer-type">CONSUMIDOR FINAL</div>
        </div>

        <div class="separator-double"></div>

        <!-- FOOTER -->
        <div class="footer-message">
          ¡Gracias por su visita!
        </div>

        <div class="system-info">
          Sistema Faro POS - FAROAI<br>
          www.faroai.com
        </div>
      </div>
    </body>
    </html>
  `;
}

// Función para imprimir ticket HTML
export function imprimirTicketHTML(ticketData: TicketData) {
  const ticketHTML = generarTicketHTML(ticketData);
  
  const ventanaImpresion = window.open('', '_blank', 'width=300,height=600');
  if (ventanaImpresion) {
    ventanaImpresion.document.write(ticketHTML);
    ventanaImpresion.document.close();
    
    // Esperar a que cargue y luego imprimir
    ventanaImpresion.onload = () => {
      ventanaImpresion.print();
      // Cerrar ventana después de imprimir (opcional)
      // ventanaImpresion.onafterprint = () => ventanaImpresion.close();
    };
  }
}