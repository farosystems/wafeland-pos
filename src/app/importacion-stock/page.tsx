'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useVariantes } from '@/hooks/use-variantes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconUpload, IconFileSpreadsheet, IconDownload, IconCheck, IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { BreadcrumbBar } from '@/components/BreadcrumbBar';
import { generateStockTemplate, validateAndImportStock } from '@/utils/generateStockTemplate';


export default function ImportacionStockPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { variantes, loading, error, fetchVariantes } = useVariantes();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVariantes, setSelectedVariantes] = useState<Set<number>>(new Set());
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [templateGenerated, setTemplateGenerated] = useState(false);
  const [importingStock, setImportingStock] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filtrar variantes basado en el término de búsqueda
  const filteredVariantes = variantes.filter(variante =>
    (variante.articulo_descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (variante.talle_descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (variante.color_descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular paginación
  const totalPages = Math.ceil(filteredVariantes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVariantes = filteredVariantes.slice(startIndex, endIndex);

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Seleccionar/deseleccionar todas las variantes
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVariantes(new Set(currentVariantes.map(v => v.id)));
    } else {
      setSelectedVariantes(new Set());
    }
  };

  // Seleccionar/deseleccionar una variante específica
  const handleSelectVariante = (varianteId: number, checked: boolean) => {
    const newSelected = new Set(selectedVariantes);
    if (checked) {
      newSelected.add(varianteId);
    } else {
      newSelected.delete(varianteId);
    }
    setSelectedVariantes(newSelected);
  };

  // Generar plantilla Excel
  const handleGenerateTemplate = async () => {
    if (selectedVariantes.size === 0) {
      alert('Por favor selecciona al menos una variante para generar la plantilla.');
      return;
    }

    setGeneratingTemplate(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selectedVariantesData = variantes.filter(v => selectedVariantes.has(v.id)) as any[];
      await generateStockTemplate(selectedVariantesData);
      setTemplateGenerated(true);
      // Deseleccionar todas las variantes después de generar la plantilla
      setSelectedVariantes(new Set());
    } catch (error) {
      console.error('Error generando plantilla:', error);
      alert('Error al generar la plantilla. Por favor intenta nuevamente.');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  // Manejar selección de archivo Excel
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') || 
          file.name.endsWith('.xls')) {
        setExcelFile(file);
      } else {
        setErrorModalMessage('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
        setShowErrorModal(true);
        setExcelFile(null);
      }
    }
  };

  // Importar stock desde Excel
  const handleImportStock = async () => {
    if (!excelFile) {
      setErrorModalMessage('Por favor selecciona un archivo Excel');
      setShowErrorModal(true);
      return;
    }

    setImportingStock(true);

    try {
      await validateAndImportStock(excelFile, variantes);
      setImportSuccess(true);
      setExcelFile(null);
      // Recargar variantes para mostrar los cambios
      await fetchVariantes();
    } catch (error: unknown) {
      console.error('Error importando stock:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' 
        ? error.message 
        : 'Error al importar el stock. Verifica el formato del archivo.';
      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setImportingStock(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600">Debes iniciar sesión para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <BreadcrumbBar />
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <IconUpload className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importación de Stock</h1>
          <p className="text-gray-600">Selecciona los artículos para generar la plantilla de importación</p>
        </div>
      </div>

      {/* Opción para saltar etapa 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconArrowRight className="w-5 h-5 text-green-600" />
            ¿Ya tienes un Excel con stock cargado?
          </CardTitle>
          <CardDescription>
            Si ya completaste la plantilla Excel con los datos de stock, puedes subirla directamente aquí. El stock se sumará al stock actual existente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Información importante:</h4>
                <p className="text-blue-700 text-sm">
                  El stock que ingreses en el Excel se <strong>sumará</strong> al stock actual existente. 
                  Si quieres reemplazar el stock, primero debes poner el stock actual en 0.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button
              onClick={handleImportStock}
              disabled={!excelFile || importingStock}
              className="flex items-center gap-2"
            >
              {importingStock ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importando...
                </>
              ) : (
                <>
                  <IconUpload className="w-4 h-4" />
                  Importar Stock
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Etapa 1: Selección de Artículos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFileSpreadsheet className="w-5 h-5 text-blue-600" />
            Seleccionar Artículos
          </CardTitle>
          <CardDescription>
            Selecciona los artículos que deseas incluir en la plantilla de importación de stock. <strong>Importante:</strong> El stock que ingreses en el Excel se sumará al stock actual existente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Búsqueda y controles */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar artículos por nombre, talle o color..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedVariantes.size === currentVariantes.length && currentVariantes.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Seleccionar todos ({selectedVariantes.size} de {currentVariantes.length})
              </label>
            </div>
          </div>

          {/* Tabla de variantes */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Seleccionar</TableHead>
                  <TableHead>ID Variante</TableHead>
                  <TableHead>ID Artículo</TableHead>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Talle</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Stock Mínimo</TableHead>
                  <TableHead>Stock Máximo</TableHead>
                  <TableHead>Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-red-600">
                      Error al cargar los datos: {error}
                    </TableCell>
                  </TableRow>
                ) : currentVariantes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No se encontraron variantes
                    </TableCell>
                  </TableRow>
                ) : (
                  currentVariantes.map((variante) => (
                    <TableRow key={variante.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedVariantes.has(variante.id)}
                          onCheckedChange={(checked) => 
                            handleSelectVariante(variante.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{variante.id}</TableCell>
                      <TableCell className="font-mono text-sm">{variante.articulo_id || variante.fk_id_articulo}</TableCell>
                      <TableCell className="font-medium">{variante.articulo_descripcion || ''}</TableCell>
                      <TableCell>{variante.talle_descripcion || ''}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: getColorHex(variante.color_descripcion || '') }}
                          />
                          {variante.color_descripcion || ''}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{variante.stock_unitario}</TableCell>
                      <TableCell className="font-mono">{variante.stock_minimo}</TableCell>
                      <TableCell className="font-mono">{variante.stock_maximo}</TableCell>
                      <TableCell className="font-mono">${variante.precio_venta || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredVariantes.length)} de {filteredVariantes.length} variantes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          {/* Botón generar plantilla */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateTemplate}
              disabled={selectedVariantes.size === 0 || generatingTemplate}
              className="flex items-center gap-2"
            >
              {generatingTemplate ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando plantilla...
                </>
              ) : (
                <>
                  <IconDownload className="w-4 h-4" />
                  Generar Plantilla Excel
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de éxito - Plantilla generada */}
      <Dialog open={templateGenerated} onOpenChange={setTemplateGenerated}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconCheck className="w-5 h-5 text-green-600" />
              Plantilla Generada Exitosamente
            </DialogTitle>
            <DialogDescription>
              La plantilla Excel ha sido generada y descargada. Completa los campos de stock y luego procede a la etapa 2 para importar los datos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Próximos pasos:</h4>
              <ol className="text-sm text-green-700 space-y-1">
                <li>1. Abre el archivo Excel descargado</li>
                <li>2. Completa las columnas: stock_unitario (se sumará al actual), stock_minimo, stock_maximo</li>
                <li>3. Guarda el archivo</li>
                <li>4. Regresa aquí para la etapa 2 de importación</li>
              </ol>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setTemplateGenerated(false)}>
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de éxito - Stock importado */}
      <Dialog open={importSuccess} onOpenChange={setImportSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconCheck className="w-5 h-5 text-green-600" />
              Stock Importado Exitosamente
            </DialogTitle>
            <DialogDescription>
              Los datos de stock han sido sumados correctamente al stock existente en la base de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Acciones realizadas:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Validación del formato del archivo Excel</li>
                <li>• Verificación de campos requeridos</li>
                <li>• Suma del stock_unitario al stock existente</li>
                <li>• Actualización de stock_minimo y stock_maximo</li>
                <li>• Recarga automática de datos</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setImportSuccess(false)}>
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de error */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="w-5 h-5 text-red-600" />
              Error de Importación
            </DialogTitle>
            <DialogDescription>
              Se encontró un problema al procesar el archivo Excel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <IconAlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-800 mb-2">Detalles del error:</h4>
                  <p className="text-red-700 text-sm whitespace-pre-wrap">{errorModalMessage}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Sugerencias:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Verifica que el archivo sea la plantilla generada por este sistema</li>
                <li>• Asegúrate de que todas las columnas estén presentes</li>
                <li>• No modifiques los nombres de las columnas</li>
                <li>• Completa todos los campos de stock antes de importar</li>
              </ul>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowErrorModal(false)}>
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Función helper para obtener el color hexadecimal
function getColorHex(colorName: string): string {
  const colorMap: { [key: string]: string } = {
    'Rojo': '#ef4444',
    'Azul': '#3b82f6',
    'Verde': '#22c55e',
    'Amarillo': '#eab308',
    'Negro': '#000000',
    'Blanco': '#ffffff',
    'Gris': '#6b7280',
    'Marrón': '#a16207',
    'Rosa': '#ec4899',
    'Púrpura': '#8b5cf6',
    'Naranja': '#f97316',
    'Cyan': '#06b6d4',
  };
  return colorMap[colorName] || '#6b7280';
} 