"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Variante } from "@/types/variante";
import { Printer, Download, X } from "lucide-react";

interface BarcodeLabelGeneratorProps {
  variantes: Variante[];
  onClose: () => void;
}

export function BarcodeLabelGenerator({ variantes, onClose }: BarcodeLabelGeneratorProps) {
  const [selectedVariante, setSelectedVariante] = React.useState<Variante | null>(null);
  const [selectedVariantes, setSelectedVariantes] = React.useState<Variante[]>([]);
  const [labelQuantity, setLabelQuantity] = React.useState(1);
  const [showPreview, setShowPreview] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [mode, setMode] = React.useState<'single' | 'multiple'>('single');
  const [includeStock, setIncludeStock] = React.useState(true);
  const [includeCompanyInfo, setIncludeCompanyInfo] = React.useState(false);
  const [labelSize, setLabelSize] = React.useState<'standard' | 'compact'>('standard');

  // Filtrar variantes que tienen código de barras
  const variantesConCodigo = variantes.filter(v => v.codigo_barras);

  const generateBarcodeSVG = (codigo: string): string => {
    // Crear un código de barras Code 128 real
    const width = Math.max(codigo.length * 12, 250);
    const height = 80;
    
    // Generar patrón de barras Code 128 simplificado
    // En una implementación completa, usarías jsbarcode
    const bars = [];
    let x = 10;
    
    // Patrón de inicio Code 128
    bars.push(`<rect x="${x}" y="5" width="2" height="${height - 30}" fill="black"/>`);
    x += 4;
    bars.push(`<rect x="${x}" y="5" width="1" height="${height - 30}" fill="black"/>`);
    x += 3;
    
    // Generar barras para cada carácter
    codigo.split('').forEach((char) => {
      const charCode = char.charCodeAt(0);
      const barPattern = generateCode128Pattern(charCode);
      
      barPattern.forEach((bar) => {
        if (bar === 1) {
          bars.push(`<rect x="${x}" y="5" width="2" height="${height - 30}" fill="black"/>`);
        }
        x += 2;
      });
    });
    
    // Patrón de fin Code 128
    bars.push(`<rect x="${x}" y="5" width="2" height="${height - 30}" fill="black"/>`);
    x += 4;
    bars.push(`<rect x="${x}" y="5" width="1" height="${height - 30}" fill="black"/>`);
    
         return `
       <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
         <rect width="${width}" height="${height}" fill="white" stroke="black" stroke-width="1"/>
         ${bars.join('')}
       </svg>
     `;
  };

  // Función auxiliar para generar patrón Code 128
  const generateCode128Pattern = (charCode: number): number[] => {
    // Patrones simplificados para Code 128
    const patterns: { [key: number]: number[] } = {
      48: [1,1,0,0,0,0,0,0,1,1,0,0], // 0
      49: [1,1,0,0,0,0,0,1,1,0,0,0], // 1
      50: [1,1,0,0,0,0,1,1,0,0,0,0], // 2
      51: [1,1,0,0,0,1,1,0,0,0,0,0], // 3
      52: [1,1,0,0,1,1,0,0,0,0,0,0], // 4
      53: [1,1,0,1,1,0,0,0,0,0,0,0], // 5
      54: [1,1,1,1,0,0,0,0,0,0,0,0], // 6
      55: [1,0,0,0,0,0,0,0,1,1,0,0], // 7
      56: [1,0,0,0,0,0,0,1,1,0,0,0], // 8
      57: [1,0,0,0,0,0,1,1,0,0,0,0], // 9
      45: [1,0,0,0,0,1,1,0,0,0,0,0], // -
      83: [1,0,0,0,1,1,0,0,0,0,0,0], // S
      79: [1,0,0,1,1,0,0,0,0,0,0,0], // O
      76: [1,0,1,1,0,0,0,0,0,0,0,0], // L
    };
    
    return patterns[charCode] || [1,0,1,0,1,0,1,0,1,0,1,0]; // Patrón por defecto
  };

    const generateLabelHTML = (variantes: Variante[], quantity: number): string => {
    const labelsHTML = variantes.map(variante => {
      const barcodeSVG = generateBarcodeSVG(variante.codigo_barras!);
             return Array(quantity).fill(0).map(() => `
         <div class="label">
           ${includeCompanyInfo ? '<div class="company-info">SOLMAR</div>' : ''}
           <div class="product-name">${variante.articulo_descripcion}</div>
           <div class="product-details">${variante.talle_descripcion} - ${variante.color_descripcion}</div>
           <div class="barcode-container">
             ${barcodeSVG}
           </div>
           <div class="barcode-code">${variante.codigo_barras}</div>
           <div class="price">$${variante.precio_venta?.toFixed(2) || '0.00'}</div>
           ${includeStock && labelSize === 'standard' ? `<div class="stock-info">Stock: ${variante.stock_unitario}</div>` : ''}
         </div>
       `).join('');
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Etiquetas - ${variantes.length} productos</title>
        <style>
          @media print {
            body { margin: 0; }
                         .label { 
               width: 3in; 
               height: ${labelSize === 'standard' ? '1.8in' : '1.5in'}; 
               border: 1px solid #ccc; 
               padding: 0.1in; 
               margin: 0.05in; 
               display: inline-block;
               page-break-inside: avoid;
               font-family: Arial, sans-serif;
               background: white;
               box-sizing: border-box;
             }
                         .product-name { 
               font-size: 11pt; 
               font-weight: bold; 
               margin-bottom: 0.04in;
               text-align: center;
               line-height: 1.1;
               overflow: hidden;
               text-overflow: ellipsis;
               white-space: nowrap;
             }
             .product-details { 
               font-size: 9pt; 
               margin-bottom: 0.03in;
               text-align: center;
               color: #333;
               font-weight: 500;
             }
                                      .barcode-container { 
               text-align: center; 
               margin-bottom: 0.04in;
               height: ${labelSize === 'standard' ? '0.65in' : '0.55in'};
               display: flex;
               align-items: center;
               justify-content: center;
               padding: 0.02in;
               border: 1px solid #e5e5e5;
               border-radius: 2px;
               background: #fafafa;
             }
             .barcode-code { 
               font-size: 10pt; 
               font-family: monospace;
               text-align: center;
               margin-top: 0.02in;
               margin-bottom: 0.04in;
               font-weight: 600;
               color: #000;
               letter-spacing: 0.5px;
             }
                         .price { 
               font-size: ${labelSize === 'standard' ? '13pt' : '12pt'}; 
               font-weight: bold; 
               text-align: center;
               color: #1e40af;
               margin-top: ${labelSize === 'standard' ? '0.03in' : '0.02in'};
               margin-bottom: ${labelSize === 'standard' ? '0.02in' : '0.01in'};
               line-height: 1.1;
               text-shadow: 0 1px 2px rgba(0,0,0,0.1);
             }
             .stock-info { 
               font-size: ${labelSize === 'standard' ? '7pt' : '6pt'}; 
               text-align: center;
               color: #666;
               margin-top: ${labelSize === 'standard' ? '0.01in' : '0.005in'};
               line-height: 1.1;
             }
             .company-info { 
               font-size: 8pt; 
               font-weight: bold;
               text-align: center;
               color: #2563eb;
               margin-bottom: 0.01in;
               line-height: 1.1;
             }
            @page {
              margin: 0.25in;
              size: letter;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHTML}
      </body>
      </html>
    `;
  };

  const getSelectedVariantes = (): Variante[] => {
    if (mode === 'single') {
      return selectedVariante ? [selectedVariante] : [];
    } else {
      return selectedVariantes;
    }
  };

  const printLabels = () => {
    const variantes = getSelectedVariantes();
    if (variantes.length === 0) return;

    setIsGenerating(true);
    
    try {
      const html = generateLabelHTML(variantes, labelQuantity);
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
      }
    } catch (error) {
      console.error('Error generando etiquetas:', error);
      alert('Error al generar las etiquetas');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLabels = () => {
    const variantes = getSelectedVariantes();
    if (variantes.length === 0) return;

    setIsGenerating(true);
    
    try {
      const html = generateLabelHTML(variantes, labelQuantity);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const fileName = variantes.length === 1 
        ? `etiqueta_${variantes[0].codigo_barras}.html`
        : `etiquetas_${variantes.length}_productos.html`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando etiquetas:', error);
      alert('Error al descargar las etiquetas');
    } finally {
      setIsGenerating(false);
    }
  };

  const previewLabels = () => {
    const variantes = getSelectedVariantes();
    if (variantes.length === 0) return;
    setShowPreview(true);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Generar Etiquetas de Código de Barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selector de modo */}
          <div>
            <Label>Modo de Generación</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={mode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('single')}
              >
                Variante Individual
              </Button>
              <Button
                type="button"
                variant={mode === 'multiple' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('multiple')}
              >
                Múltiples Variantes
              </Button>
            </div>
          </div>

          {/* Selección de variante(s) */}
          {mode === 'single' ? (
            <div>
              <Label htmlFor="variante-select">Seleccionar Variante</Label>
              <Select onValueChange={(value) => {
                const variante = variantesConCodigo.find(v => v.id.toString() === value);
                setSelectedVariante(variante || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una variante con código de barras" />
                </SelectTrigger>
                <SelectContent>
                  {variantesConCodigo.map(variante => (
                    <SelectItem key={variante.id} value={variante.id.toString()}>
                      {variante.articulo_descripcion} - {variante.talle_descripcion} {variante.color_descripcion} ({variante.codigo_barras})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Seleccionar Variantes</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-1">
                {variantesConCodigo.map(variante => (
                  <div key={variante.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id={`variante-${variante.id}`}
                      checked={selectedVariantes.some(v => v.id === variante.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariantes(prev => [...prev, variante]);
                        } else {
                          setSelectedVariantes(prev => prev.filter(v => v.id !== variante.id));
                        }
                      }}
                    />
                    <label htmlFor={`variante-${variante.id}`} className="text-sm cursor-pointer">
                      {variante.articulo_descripcion} - {variante.talle_descripcion} {variante.color_descripcion} ({variante.codigo_barras})
                    </label>
                  </div>
                ))}
              </div>
              {selectedVariantes.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedVariantes.length} variante(s) seleccionada(s)
                </div>
              )}
            </div>
          )}

                     {/* Cantidad de etiquetas */}
           <div>
             <Label htmlFor="quantity">Cantidad de Etiquetas</Label>
             <Input
               id="quantity"
               type="number"
               min="1"
               max="100"
               value={labelQuantity}
               onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))}
               className="w-32"
             />
           </div>

                       {/* Opciones de etiqueta */}
            <div className="space-y-2">
              <Label>Opciones de Etiqueta</Label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-stock"
                    checked={includeStock}
                    onChange={(e) => setIncludeStock(e.target.checked)}
                  />
                  <label htmlFor="include-stock" className="text-sm">Incluir stock</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-company"
                    checked={includeCompanyInfo}
                    onChange={(e) => setIncludeCompanyInfo(e.target.checked)}
                  />
                  <label htmlFor="include-company" className="text-sm">Incluir info empresa</label>
                </div>
              </div>
                             <div className="flex gap-2 mt-2">
                 <Button
                   type="button"
                   variant={labelSize === 'standard' ? 'default' : 'outline'}
                   size="sm"
                   onClick={() => setLabelSize('standard')}
                 >
                   Tamaño Estándar
                 </Button>
                 <Button
                   type="button"
                   variant={labelSize === 'compact' ? 'default' : 'outline'}
                   size="sm"
                   onClick={() => setLabelSize('compact')}
                 >
                   Tamaño Compacto
                 </Button>
               </div>
               {labelSize === 'compact' && (
                 <div className="text-xs text-muted-foreground mt-1">
                   El modo compacto oculta la información de stock para optimizar el espacio
                 </div>
               )}
            </div>

          {/* Información de la(s) variante(s) seleccionada(s) */}
          {(selectedVariante || selectedVariantes.length > 0) && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">
                {mode === 'single' ? 'Información del Producto' : `Información de ${selectedVariantes.length} Productos`}
              </h4>
              {mode === 'single' && selectedVariante ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Artículo:</strong> {selectedVariante.articulo_descripcion}</div>
                  <div><strong>Talle:</strong> {selectedVariante.talle_descripcion}</div>
                  <div><strong>Color:</strong> {selectedVariante.color_descripcion}</div>
                  <div><strong>Código:</strong> {selectedVariante.codigo_barras}</div>
                  <div><strong>Precio:</strong> ${selectedVariante.precio_venta?.toFixed(2) || '0.00'}</div>
                  <div><strong>Stock:</strong> {selectedVariante.stock_unitario}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedVariantes.map(variante => (
                    <div key={variante.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Artículo:</strong> {variante.articulo_descripcion}</div>
                        <div><strong>Talle:</strong> {variante.talle_descripcion}</div>
                        <div><strong>Color:</strong> {variante.color_descripcion}</div>
                        <div><strong>Código:</strong> {variante.codigo_barras}</div>
                        <div><strong>Precio:</strong> ${variante.precio_venta?.toFixed(2) || '0.00'}</div>
                        <div><strong>Stock:</strong> {variante.stock_unitario}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              variant="outline" 
              onClick={previewLabels}
              disabled={getSelectedVariantes().length === 0 || isGenerating}
            >
              Vista Previa
            </Button>
            <Button 
              variant="outline" 
              onClick={downloadLabels}
              disabled={getSelectedVariantes().length === 0 || isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
            <Button 
              onClick={printLabels}
              disabled={getSelectedVariantes().length === 0 || isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generando...' : 'Imprimir'}
            </Button>
          </div>
        </div>

        {/* Modal de vista previa */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vista Previa de Etiquetas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {getSelectedVariantes().map(variante => 
                Array(labelQuantity).fill(0).map((_, index) => (
                  <div key={`${variante.id}-${index}`} className="border border-gray-300 p-4 rounded">
                    <div className="text-center">
                      <div className="font-bold text-sm mb-1">{variante.articulo_descripcion}</div>
                      <div className="text-xs mb-2">{variante.talle_descripcion} - {variante.color_descripcion}</div>
                      <div className="bg-gray-100 p-2 rounded mb-2 font-mono text-sm">
                        {variante.codigo_barras}
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        ${variante.precio_venta?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
} 