"use client";
import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useClientesSecure } from "@/hooks/use-clientes-secure";
import { getArticles } from "@/services/articles";
import { Article } from "@/types/article";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { generateOrdenCompraPDF } from "@/utils/generateOrdenCompraPDF";

export default function StockFaltantePage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [articulos, setArticulos] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { clientes } = useClientesSecure();
  const [filter, setFilter] = React.useState("");
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;
  
  // Estados para la modal de orden de compra
  const [showOrdenModal, setShowOrdenModal] = React.useState(false);
  const [selectedArticulos, setSelectedArticulos] = React.useState<Set<number>>(new Set());
  const [selectedProveedor, setSelectedProveedor] = React.useState<number>(0);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [preciosUnitarios, setPreciosUnitarios] = React.useState<{[key: number]: number}>({});
  const [descuento, setDescuento] = React.useState(0);
  const [tasaImpuestos, setTasaImpuestos] = React.useState(21);
  const [envioAlmacenaje, setEnvioAlmacenaje] = React.useState(0);
  const [notas, setNotas] = React.useState("");
  
  // Estado para la modal de éxito
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [ordenGenerada, setOrdenGenerada] = React.useState<any>(null);
  
  // Estados para configuración
  const [configEmpresa] = React.useState<any>({
    id: 1,
    nombre: "Mi Empresa",
    domicilio: "Dirección de la empresa",
    ciudad: "Ciudad, Estado, CP"
  });

  // Cargar artículos al montar el componente
  React.useEffect(() => {
    const fetchArticulos = async () => {
      try {
        setLoading(true);
        const data = await getArticles();
        setArticulos(data);
      } catch (err: any) {
        setError(err.message || "Error al cargar artículos");
      } finally {
        setLoading(false);
      }
    };
    
    if (isSignedIn) {
      fetchArticulos();
    }
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver el stock faltante.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Cargando artículos...</span>
      </div>
    );
  }

  // Filtrar artículos con stock faltante (stock <= stock_minimo)
  const articulosConStockFaltante = articulos.filter(art => 
    art.stock <= (art.stock_minimo ?? 0)
  );

  // Aplicar filtro de búsqueda
  const articulosFiltrados = articulosConStockFaltante.filter(art =>
    (!filter ||
      art.descripcion?.toLowerCase().includes(filter.toLowerCase())
    )
  );

  const articulosPaginados = articulosFiltrados.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(articulosFiltrados.length / rowsPerPage);

  // Calcular estadísticas
  const totalArticulosFaltantes = articulosConStockFaltante.length;
  const stockFaltanteTotal = articulosConStockFaltante.reduce((acc, art) => {
    const faltante = (art.stock_minimo ?? 0) - art.stock;
    return acc + Math.max(0, faltante);
  }, 0);

  // Funciones para manejar la orden de compra
  const handleOpenOrdenModal = () => {
    setShowOrdenModal(true);
    setSelectedArticulos(new Set());
    setSelectedProveedor(0);
    setPreciosUnitarios({});
    setDescuento(0);
    setTasaImpuestos(21);
    setEnvioAlmacenaje(0);
    setNotas("");
  };

  const handleCloseOrdenModal = () => {
    setShowOrdenModal(false);
    setSelectedArticulos(new Set());
    setSelectedProveedor(0);
    setIsGenerating(false);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setOrdenGenerada(null);
  };

  const handleArticuloSelection = (articuloId: number, checked: boolean) => {
    const newSelected = new Set(selectedArticulos);
    if (checked) {
      newSelected.add(articuloId);
    } else {
      newSelected.delete(articuloId);
    }
    setSelectedArticulos(newSelected);
  };

  const handlePrecioChange = (articuloId: number, precio: number) => {
    setPreciosUnitarios(prev => ({
      ...prev,
      [articuloId]: precio
    }));
  };

  const calcularTotales = () => {
    let subtotal = 0;
    
    articulosConStockFaltante.forEach(articulo => {
      if (selectedArticulos.has(articulo.id)) {
        const precio = preciosUnitarios[articulo.id] || 0;
        const stockFaltante = (articulo.stock_minimo ?? 0) - articulo.stock;
        subtotal += precio * Math.max(0, stockFaltante);
      }
    });

    const subtotalMenosDescuento = subtotal * (1 - descuento / 100);
    const totalImpuestos = subtotalMenosDescuento * (tasaImpuestos / 100);
    const total = subtotalMenosDescuento + totalImpuestos + envioAlmacenaje;

    return {
      subtotal,
      subtotalMenosDescuento,
      totalImpuestos,
      total
    };
  };

  const handleGenerarOrden = async () => {
    if (selectedArticulos.size === 0) {
      alert("Debes seleccionar al menos un artículo");
      return;
    }

    if (selectedProveedor === 0) {
      alert("Debes seleccionar un proveedor");
      return;
    }

    setIsGenerating(true);

    try {
      const { subtotal, subtotalMenosDescuento, totalImpuestos, total } = calcularTotales();
      
      // Crear items de la orden
      const items: {
        fk_id_articulo: number;
        cantidad: number;
        precio_unitario: number;
        subtotal: number;
        articulo_descripcion: string;
      }[] = [];
      
      articulosConStockFaltante.forEach(articulo => {
        if (selectedArticulos.has(articulo.id)) {
          const precio = preciosUnitarios[articulo.id] || 0;
          const stockFaltante = (articulo.stock_minimo ?? 0) - articulo.stock;
          const cantidad = Math.max(0, stockFaltante);
          
          items.push({
            fk_id_articulo: articulo.id,
            cantidad,
            precio_unitario: precio,
            subtotal: precio * cantidad,
            articulo_descripcion: articulo.descripcion ?? '',
          });
        }
      });

      // Generar número de orden
      const numeroOrden = `OC-${Date.now()}`;
      const fecha = new Date().toISOString().split('T')[0];

      // Crear objeto de orden para el PDF
      const ordenCompleta = {
        id: Date.now(),
        numero_orden: numeroOrden,
        fecha,
        fk_id_proveedor: selectedProveedor,
                 fk_id_empresa: configEmpresa.id,
        subtotal,
        descuento_porcentaje: descuento,
        subtotal_menos_descuento: subtotalMenosDescuento,
        tasa_impuestos: tasaImpuestos,
        total_impuestos: totalImpuestos,
        envio_almacenaje: envioAlmacenaje,
        total,
        estado: 'borrador' as const,
        notas,
        proveedor_razon_social: clientes.find(p => p.id === selectedProveedor)?.razon_social,
                 empresa_nombre: configEmpresa.nombre,
        items
      };
      
             // Generar PDF directamente
       await generateOrdenCompraPDF(ordenCompleta);
       
       handleCloseOrdenModal();
       setOrdenGenerada(ordenCompleta);
       setShowSuccessModal(true);
      
    } catch (error) {
      console.error("Error al generar orden:", error);
      alert("Error al generar la orden de compra");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6">
      <BreadcrumbBar />
      <div className="w-full py-8 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold">Stock Faltante</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Productos con stock insuficiente que requieren reposición
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Artículos con stock bajo</p>
              <p className="text-2xl font-bold text-red-700">{totalArticulosFaltantes}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Unidades faltantes</p>
              <p className="text-2xl font-bold text-orange-700">{stockFaltanteTotal}</p>
            </div>
            <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">U</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Input 
                          placeholder="Filtrar por artículo..." 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="max-w-xs" 
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {articulosFiltrados.length} de {totalArticulosFaltantes} artículos con stock bajo
          </div>
          {totalArticulosFaltantes > 0 && (
            <Button 
              onClick={handleOpenOrdenModal}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isGenerating}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generar orden a proveedor
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Artículo</TableHead>

              <TableHead>Stock actual</TableHead>
              <TableHead>Stock mínimo</TableHead>
              <TableHead>Stock faltante</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articulosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {articulosConStockFaltante.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-12 w-12 text-green-500" />
                      <p className="text-lg font-medium text-green-700">¡Excelente!</p>
                      <p className="text-muted-foreground">No hay artículos con stock bajo</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-12 w-12 text-gray-400" />
                      <p className="text-lg font-medium text-gray-600">No se encontraron resultados</p>
                      <p className="text-muted-foreground">Intenta con otros términos de búsqueda</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : articulosPaginados.map(art => {
              const stockFaltante = (art.stock_minimo ?? 0) - art.stock;
              const porcentajeStock = art.stock_minimo ? Math.round((art.stock / art.stock_minimo) * 100) : 0;
              
              return (
                <TableRow key={art.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{art.id}</TableCell>
                  <TableCell className="font-medium">{art.descripcion}</TableCell>

                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                      {art.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {art.stock_minimo ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 font-bold">
                      {Math.max(0, stockFaltante)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-xs font-medium text-red-700">
                        {porcentajeStock}% del mínimo
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <div className="space-x-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
      </div>

      {/* Modal de Generación de Orden de Compra */}
      <Dialog open={showOrdenModal} onOpenChange={setShowOrdenModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generar Orden de Compra
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Selección de Proveedor */}
            <div>
              <label className="block text-sm font-medium mb-2">Proveedor</label>
              <select
                value={selectedProveedor}
                onChange={(e) => setSelectedProveedor(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                                 <option value={0}>Seleccionar proveedor</option>
                 {clientes.filter(c => c.tipo === 'proveedor').map(proveedor => (
                   <option key={proveedor.id} value={proveedor.id}>
                     {proveedor.razon_social}
                   </option>
                 ))}
              </select>
            </div>

            {/* Lista de Artículos con Stock Faltante */}
            <div>
              <h3 className="text-lg font-medium mb-3">Productos a Reponer</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Seleccionar</TableHead>
                      <TableHead>Artículo</TableHead>

                      <TableHead>Stock Faltante</TableHead>
                      <TableHead>Precio Unitario</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articulosConStockFaltante.map(art => {
                      const stockFaltante = (art.stock_minimo ?? 0) - art.stock;
                      const precio = preciosUnitarios[art.id] || 0;
                      const subtotal = precio * Math.max(0, stockFaltante);
                      const isSelected = selectedArticulos.has(art.id);
                      
                      return (
                        <TableRow key={art.id}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleArticuloSelection(art.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {art.descripcion}
                          </TableCell>

                          <TableCell>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              {Math.max(0, stockFaltante)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={precio}
                              onChange={(e) => handlePrecioChange(art.id, Number(e.target.value))}
                              className="w-20 h-8 text-sm"
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              ${subtotal.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Configuración de la Orden */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Descuento (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={descuento}
                  onChange={(e) => setDescuento(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tasa de Impuestos (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={tasaImpuestos}
                  onChange={(e) => setTasaImpuestos(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Envío / Almacenaje</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={envioAlmacenaje}
                  onChange={(e) => setEnvioAlmacenaje(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notas / Observaciones</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full border rounded px-3 py-2 h-20 resize-none"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            {/* Resumen de Totales */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Resumen de Totales</h3>
              <div className="space-y-2">
                {(() => {
                  const { subtotal, subtotalMenosDescuento, totalImpuestos, total } = calcularTotales();
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Descuento ({descuento}%):</span>
                        <span className="font-medium">-${(subtotal - subtotalMenosDescuento).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subtotal menos descuento:</span>
                        <span className="font-medium">${subtotalMenosDescuento.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Impuestos ({tasaImpuestos}%):</span>
                        <span className="font-medium">${totalImpuestos.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Envío / Almacenaje:</span>
                        <span className="font-medium">${envioAlmacenaje.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>TOTAL:</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCloseOrdenModal}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerarOrden}
              disabled={isGenerating || selectedArticulos.size === 0 || selectedProveedor === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando orden...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Confirmar y Generar PDF
                </>
              )}
            </Button>
                     </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Modal de Éxito */}
       <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-green-600">
               <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                 <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
               </div>
               Orden Generada Exitosamente
             </DialogTitle>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="text-center">
               <p className="text-gray-600 mb-4">
                 La orden de compra ha sido generada y el PDF se ha descargado automáticamente.
               </p>
               
               {ordenGenerada && (
                 <div className="bg-gray-50 p-4 rounded-lg text-left">
                   <h4 className="font-medium text-gray-900 mb-2">Detalles de la Orden:</h4>
                   <div className="space-y-1 text-sm text-gray-600">
                     <div className="flex justify-between">
                       <span>Número de Orden:</span>
                       <span className="font-medium">{ordenGenerada.numero_orden}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Proveedor:</span>
                       <span className="font-medium">{ordenGenerada.proveedor_razon_social}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Total:</span>
                       <span className="font-medium text-green-600">${ordenGenerada.total.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Artículos:</span>
                       <span className="font-medium">{ordenGenerada.items.length}</span>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>

           <DialogFooter>
             <Button 
               onClick={handleCloseSuccessModal}
               className="bg-green-600 hover:bg-green-700 text-white"
             >
               Entendido
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 } 