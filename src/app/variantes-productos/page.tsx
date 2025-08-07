"use client";
import * as React from "react";
import { useVariantes } from "@/hooks/use-variantes";
import { useArticles } from "@/hooks/use-articles";
import { useTalles } from "@/hooks/use-talles";
import { useColores } from "@/hooks/use-colores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash, Plus, Palette, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Variante } from "@/types/variante";
import { createMovimientoStock } from "@/services/movimientosStock";
import { updateArticle } from "@/services/articles";
import { getVariantes } from "@/services/variantes";
import { BarcodeLabelGenerator } from "@/components/variantes/barcode-label-generator";

// Función helper para obtener el color hexadecimal basado en el nombre del color
const getColorHex = (colorName: string): string => {
  if (!colorName) return '#ccc';
  
  const colorNameLower = colorName.toLowerCase().trim();
  
  // Si ya es un código hexadecimal válido, devolverlo tal como está
  if (/^#[0-9A-F]{6}$/i.test(colorName)) {
    return colorName;
  }
  
  // Si es un código hexadecimal de 3 caracteres, expandirlo
  if (/^#[0-9A-F]{3}$/i.test(colorName)) {
    return colorName.split('').map(char => char === '#' ? '#' : char + char).join('');
  }
  
  // Mapeo de colores comunes en español
  const colorMap: { [key: string]: string } = {
    // Colores básicos
    'rojo': '#ef4444',
    'azul': '#3b82f6',
    'verde': '#10b981',
    'amarillo': '#f59e0b',
    'negro': '#000000',
    'blanco': '#ffffff',
    'gris': '#6b7280',
    'rosa': '#ec4899',
    'morado': '#8b5cf6',
    'naranja': '#f97316',
    'marron': '#a16207',
    'celeste': '#0ea5e9',
    'violeta': '#7c3aed',
    'turquesa': '#14b8a6',
    'beige': '#f5f5dc',
    'coral': '#ff7f50',
    'lila': '#c084fc',
    'dorado': '#fbbf24',
    'plateado': '#c0c0c0',
    'bordo': '#dc2626',
    'navy': '#1e3a8a',
    'oliva': '#84cc16',
    'salmon': '#fb7185',
    'lavanda': '#a78bfa',
    'menta': '#34d399',
    'crema': '#fef3c7',
    'chocolate': '#92400e',
    'cobre': '#b45309',
    'esmeralda': '#059669',
    
    // Variaciones
    'rojo claro': '#fca5a5',
    'rojo oscuro': '#dc2626',
    'azul claro': '#93c5fd',
    'azul oscuro': '#1e40af',
    'verde claro': '#86efac',
    'verde oscuro': '#047857',
    'amarillo claro': '#fde047',
    'amarillo oscuro': '#d97706',
    'rosa claro': '#f9a8d4',
    'rosa oscuro': '#be185d',
    'morado claro': '#c4b5fd',
    'morado oscuro': '#5b21b6',
    'naranja claro': '#fdba74',
    'naranja oscuro': '#ea580c',
    'marron claro': '#d97706',
    'marron oscuro': '#78350f',
    'gris claro': '#d1d5db',
    'gris oscuro': '#374151',
    
    // Colores de moda
    'fucsia': '#e91e63',
    'magenta': '#ec4899',
    'cian': '#06b6d4',
    'indigo': '#6366f1',
    'púrpura': '#9333ea',
    'carmesí': '#dc2626',
    'bermellón': '#ef4444',
    'ocre': '#d97706',
    'sepia': '#92400e',
    'caqui': '#84cc16',
    'mostaza': '#f59e0b',
    'aqua': '#14b8a6',
    'teal': '#0f766e',
    'slate': '#475569',
    'zinc': '#71717a',
    'neutral': '#737373',
    'stone': '#78716c',
    
    // Colores en inglés (por si acaso)
    'red': '#ef4444',
    'orange': '#f97316',
    'amber': '#f59e0b',
    'yellow': '#eab308',
    'lime': '#84cc16',
    'green': '#22c55e',
    'emerald': '#10b981',
    'cyan': '#06b6d4',
    'sky': '#0ea5e9',
    'blue': '#3b82f6',
    'violet': '#8b5cf6',
    'purple': '#a855f7',
    'fuchsia': '#d946ef',
    'pink': '#ec4899',
    'rose': '#f43f5e',
  };
  
  // Buscar coincidencia exacta
  if (colorMap[colorNameLower]) {
    return colorMap[colorNameLower];
  }
  
  // Buscar coincidencia parcial (por ejemplo, "rojo" en "rojo claro")
  for (const [key, value] of Object.entries(colorMap)) {
    if (colorNameLower.includes(key) || key.includes(colorNameLower)) {
      return value;
    }
  }
  
  // Si no encuentra coincidencia, generar un color único basado en el hash del nombre
  let hash = 0;
  for (let i = 0; i < colorNameLower.length; i++) {
    hash = colorNameLower.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generar un color pastel único basado en el hash
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 30); // 60-90%
  const lightness = 65 + (Math.abs(hash) % 20); // 65-85%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export default function VariantesProductosPage() {
  const { variantes, addVariante, editVariante, deleteVariante, error, fetchVariantes } = useVariantes();
  const { articles } = useArticles();
  const { talles } = useTalles();
  const { colores } = useColores();
  const [filter, setFilter] = React.useState("");
  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;
  const [showDialog, setShowDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Variante | null>(null);
  const [form, setForm] = React.useState({
    fk_id_articulo: 0,
    fk_id_talle: 0,
    fk_id_color: 0,
    stock_unitario: 0,
    stock_minimo: 0,
    stock_maximo: 0,
    stockNuevo: 0,
    stockDescontar: 0,
    codigo_barras: '',
  });
  const [errorForm, setErrorForm] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [varianteToDelete, setVarianteToDelete] = React.useState<{ id: number, fk_id_articulo: number, descripcion: string } | null>(null);
  const [editingStockId, setEditingStockId] = React.useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = React.useState<string>("");
  const [updatingStockId, setUpdatingStockId] = React.useState<number | null>(null);
  const [showBarcodeGenerator, setShowBarcodeGenerator] = React.useState(false);

  // Filtro
  const variantesFiltradas = variantes.filter(v =>
    (!filter ||
      v.articulo_descripcion?.toLowerCase().includes(filter.toLowerCase()) ||
      v.talle_descripcion?.toLowerCase().includes(filter.toLowerCase()) ||
      v.color_descripcion?.toLowerCase().includes(filter.toLowerCase())
    )
  );
  const variantesPaginadas = variantesFiltradas.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(variantesFiltradas.length / rowsPerPage);

  // Función para generar código de barras automáticamente
  const generarCodigoBarras = () => {
    if (form.fk_id_articulo && form.fk_id_talle && form.fk_id_color) {
      const codigo = `SOL-${form.fk_id_articulo.toString().padStart(3, '0')}-${form.fk_id_talle.toString().padStart(2, '0')}-${form.fk_id_color.toString().padStart(2, '0')}`;
      setForm(f => ({ ...f, codigo_barras: codigo }));
    }
  };

  // Generar código automáticamente cuando se seleccionan todos los campos
  React.useEffect(() => {
    if (form.fk_id_articulo && form.fk_id_talle && form.fk_id_color && !form.codigo_barras) {
      generarCodigoBarras();
    }
  }, [form.fk_id_articulo, form.fk_id_talle, form.fk_id_color]);

  // Función para generar códigos de barras faltantes masivamente
  const generarCodigosFaltantes = async () => {
    const variantesSinCodigo = variantes.filter(v => !v.codigo_barras);
    
    if (variantesSinCodigo.length === 0) {
      alert('Todas las variantes ya tienen códigos de barras asignados');
      return;
    }

    if (!confirm(`¿Generar códigos de barras para ${variantesSinCodigo.length} variantes sin código?`)) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      for (const variante of variantesSinCodigo) {
        const codigo = `SOL-${variante.fk_id_articulo.toString().padStart(3, '0')}-${variante.fk_id_talle.toString().padStart(2, '0')}-${variante.fk_id_color.toString().padStart(2, '0')}`;
        
        await editVariante(variante.id, {
          stock_unitario: variante.stock_unitario,
          stock_minimo: variante.stock_minimo,
          stock_maximo: variante.stock_maximo,
          fk_id_talle: variante.fk_id_talle,
          fk_id_color: variante.fk_id_color,
          codigo_barras: codigo,
        });
      }
      
      await fetchVariantes();
      alert(`Se generaron códigos de barras para ${variantesSinCodigo.length} variantes`);
    } catch (error) {
      console.error('Error generando códigos:', error);
      alert('Error al generar códigos de barras');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir dialog para crear o editar
  const openNew = () => {
    setEditing(null);
    setForm({ fk_id_articulo: 0, fk_id_talle: 0, fk_id_color: 0, stock_unitario: 0, stock_minimo: 0, stock_maximo: 0, stockNuevo: 0, stockDescontar: 0, codigo_barras: '' });
    setShowDialog(true);
  };
  const openEdit = (v: Variante) => {
    setEditing(v);
    setForm({
      fk_id_articulo: v.fk_id_articulo,
      fk_id_talle: v.fk_id_talle,
      fk_id_color: v.fk_id_color,
      stock_unitario: v.stock_unitario,
      stock_minimo: v.stock_minimo ?? 0,
      stock_maximo: v.stock_maximo ?? 0,
      stockNuevo: 0,
      stockDescontar: 0,
      codigo_barras: v.codigo_barras || '',
    });
    setShowDialog(true);
  };

  // Guardar variante (alta o edición)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevenir múltiples envíos
    if (isSubmitting) return;
    
    if (!form.fk_id_articulo || !form.fk_id_talle || !form.fk_id_color) {
      setErrorForm("Todos los campos son obligatorios");
      return;
    }
    
    if (form.stock_maximo < form.stock_minimo) {
      setErrorForm("El stock máximo no puede ser menor que el stock mínimo");
      return;
    }

    // Validar código de barras único (solo si se proporciona)
    if (form.codigo_barras && form.codigo_barras.trim()) {
      const codigoExistente = variantes.find(v => 
        v.codigo_barras === form.codigo_barras && v.id !== editing?.id
      );
      if (codigoExistente) {
        setErrorForm("Este código de barras ya está asignado a otra variante");
        return;
      }
    }
    
    setIsSubmitting(true);
    setErrorForm("");
    
    try {
      let newStock = form.stock_unitario + form.stockNuevo - form.stockDescontar;
      if (newStock < 0) newStock = 0;
      
      if (editing) {
        await editVariante(editing.id, {
          stock_unitario: newStock,
          stock_minimo: form.stock_minimo,
          stock_maximo: form.stock_maximo,
          fk_id_talle: form.fk_id_talle,
          fk_id_color: form.fk_id_color,
          codigo_barras: form.codigo_barras,
        });
        // Registrar movimiento de stock
        if (form.stockNuevo !== 0) {
          await createMovimientoStock({
            fk_id_orden: null,
            fk_id_articulos: form.fk_id_articulo,
            origen: "AJUSTE",
            tipo: "entrada",
            cantidad: form.stockNuevo,
            fk_id_talle: form.fk_id_talle,
            fk_id_color: form.fk_id_color,
            stock_actual: 0, // Se calculará después del ajuste
          });
        }
        if (form.stockDescontar !== 0) {
          await createMovimientoStock({
            fk_id_orden: null,
            fk_id_articulos: form.fk_id_articulo,
            origen: "AJUSTE",
            tipo: "salida",
            cantidad: -Math.abs(form.stockDescontar),
            fk_id_talle: form.fk_id_talle,
            fk_id_color: form.fk_id_color,
            stock_actual: 0, // Se calculará después del ajuste
          });
        }
      } else {
        await addVariante({
          fk_id_articulo: form.fk_id_articulo,
          fk_id_talle: form.fk_id_talle,
          fk_id_color: form.fk_id_color,
          stock_unitario: newStock,
          stock_minimo: form.stock_minimo,
          stock_maximo: form.stock_maximo,
          codigo_barras: form.codigo_barras,
        });
        if (form.stockNuevo > 0) {
          await createMovimientoStock({
            fk_id_orden: null,
            fk_id_articulos: form.fk_id_articulo,
            origen: "AJUSTE",
            tipo: "entrada",
            cantidad: form.stockNuevo,
            fk_id_talle: form.fk_id_talle,
            fk_id_color: form.fk_id_color,
            stock_actual: 0, // Se calculará después del ajuste
          });
        }
      }
      
      // Actualizar stock total del artículo
      const variantesArticulo = await getVariantes();
      const variantesDeArticulo = variantesArticulo.filter(v => v.fk_id_articulo === form.fk_id_articulo);
      const stockTotal = variantesDeArticulo.reduce((acc, v) => acc + v.stock_unitario, 0);
      await updateArticle(form.fk_id_articulo, { stock: stockTotal });
      await fetchVariantes();
      setShowDialog(false);
    } catch (error) {
      console.error("Error al guardar variante:", error);
      setErrorForm("Error al guardar la variante. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de confirmación de eliminación
  const openDeleteModal = (variante: Variante) => {
    const descripcion = `${variante.articulo_descripcion} - ${variante.talle_descripcion} - ${variante.color_descripcion}`;
    setVarianteToDelete({
      id: variante.id,
      fk_id_articulo: variante.fk_id_articulo,
      descripcion: descripcion
    });
    setShowDeleteModal(true);
  };

  // Confirmar eliminación de variante
  const confirmDelete = async () => {
    if (!varianteToDelete) return;
    
    setDeletingId(varianteToDelete.id);
    setShowDeleteModal(false);
    
    try {
      await deleteVariante(varianteToDelete.id);
      // Actualizar stock total del artículo
      const variantesArticulo = await getVariantes();
      const variantesDeArticulo = variantesArticulo.filter(v => v.fk_id_articulo === varianteToDelete.fk_id_articulo);
      const stockTotal = variantesDeArticulo.reduce((acc, v) => acc + v.stock_unitario, 0);
      await updateArticle(varianteToDelete.fk_id_articulo, { stock: stockTotal });
      await fetchVariantes();
    } catch (error) {
      console.error("Error al eliminar variante:", error);
    } finally {
      setDeletingId(null);
      setVarianteToDelete(null);
    }
  };

  // Iniciar edición inline del stock
  const startStockEdit = (variante: Variante) => {
    setEditingStockId(variante.id);
    setEditingStockValue(variante.stock_unitario.toString());
  };

  // Guardar edición inline del stock
  const saveStockEdit = async () => {
    if (!editingStockId || editingStockValue === "") return;
    
    const newStock = parseInt(editingStockValue);
    if (isNaN(newStock) || newStock < 0) {
      setEditingStockValue("");
      setEditingStockId(null);
      return;
    }

    setUpdatingStockId(editingStockId);
    
    try {
      // Encontrar la variante actual
      const variante = variantes.find(v => v.id === editingStockId);
      if (!variante) return;

      // Calcular la diferencia de stock
      const stockDifference = newStock - variante.stock_unitario;
      
      // Actualizar la variante
      await editVariante(editingStockId, {
        stock_unitario: newStock,
        fk_id_talle: variante.fk_id_talle,
        fk_id_color: variante.fk_id_color,
      });

      // Registrar movimiento de stock si hay diferencia
      if (stockDifference !== 0) {
        await createMovimientoStock({
          fk_id_orden: null,
          fk_id_articulos: variante.fk_id_articulo,
          origen: "AJUSTE",
          tipo: stockDifference > 0 ? "entrada" : "salida",
          cantidad: Math.abs(stockDifference),
          fk_id_talle: variante.fk_id_talle,
          fk_id_color: variante.fk_id_color,
          stock_actual: 0, // Se calculará después del ajuste
        });
      }

      // Actualizar stock total del artículo
      const variantesArticulo = await getVariantes();
      const variantesDeArticulo = variantesArticulo.filter(v => v.fk_id_articulo === variante.fk_id_articulo);
      const stockTotal = variantesDeArticulo.reduce((acc, v) => acc + v.stock_unitario, 0);
      await updateArticle(variante.fk_id_articulo, { stock: stockTotal });
      
      await fetchVariantes();
    } catch (error) {
      console.error("Error al actualizar stock:", error);
    } finally {
      setUpdatingStockId(null);
      setEditingStockId(null);
      setEditingStockValue("");
    }
  };

  // Cancelar edición inline del stock
  const cancelStockEdit = () => {
    setEditingStockId(null);
    setEditingStockValue("");
  };

  // Manejar tecla Enter y Escape en la edición inline
  const handleStockKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveStockEdit();
    } else if (e.key === "Escape") {
      cancelStockEdit();
    }
  };

  return (
    <div className="w-full py-8 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Variantes de Productos</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Gestiona las combinaciones de talles y colores para cada artículo del catálogo
        </p>
      </div>
      
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Input placeholder="Filtrar por artículo, talle o color..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-xs" />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={openNew} 
            className="bg-primary hover:bg-primary/90"
            disabled={isSubmitting || deletingId !== null || editingStockId !== null || updatingStockId !== null}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva variante
          </Button>
          <Button 
            onClick={generarCodigosFaltantes}
            variant="outline"
            disabled={isSubmitting || deletingId !== null || editingStockId !== null || updatingStockId !== null}
          >
            Generar Códigos Faltantes
          </Button>
          <Button 
            onClick={() => setShowBarcodeGenerator(true)}
            variant="outline"
            disabled={isSubmitting || deletingId !== null || editingStockId !== null || updatingStockId !== null}
          >
            <Printer className="mr-2 h-4 w-4" />
            Generar Etiquetas
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Stock normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Stock bajo (≤ mínimo)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Stock alto (≥ máximo)</span>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Artículo</TableHead>
              <TableHead>Talle</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Código de Barras</TableHead>
              <TableHead>Stock unitario</TableHead>
              <TableHead>Stock mínimo</TableHead>
              <TableHead>Stock máximo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variantesPaginadas.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center">No hay variantes.</TableCell></TableRow>
            ) : variantesPaginadas.map(v => (
              <TableRow key={v.id}>
                <TableCell>{v.id}</TableCell>
                <TableCell>{v.articulo_descripcion}</TableCell>
                <TableCell>{v.talle_descripcion}</TableCell>
                                 <TableCell>
                   <div className="flex items-center gap-3">
                     <div 
                       className="w-8 h-8 rounded-lg border-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                       style={{ 
                         backgroundColor: getColorHex(v.color_descripcion ?? ''),
                         borderColor: ['blanco', 'beige', 'crema', 'amarillo claro', 'rosa claro', 'celeste'].includes(v.color_descripcion?.toLowerCase() ?? '') 
                           ? '#d1d5db' 
                           : '#e5e7eb'
                       }}
                       title={`Color: ${v.color_descripcion ?? ''}`}
                     />
                     <span className="text-sm font-medium">{v.color_descripcion ?? ''}</span>
                   </div>
                 </TableCell>
                 <TableCell>
                   <div className="text-sm font-mono">
                     {v.codigo_barras ? (
                       <div className="flex items-center gap-2">
                         <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                           {v.codigo_barras}
                         </span>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => navigator.clipboard.writeText(v.codigo_barras!)}
                           className="h-6 w-6 p-0"
                           title="Copiar código"
                         >
                           <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                           </svg>
                         </Button>
                       </div>
                     ) : (
                       <span className="text-gray-400 text-xs">Sin código</span>
                     )}
                   </div>
                 </TableCell>
                <TableCell>
                  {editingStockId === v.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={editingStockValue}
                        onChange={(e) => setEditingStockValue(e.target.value)}
                        onKeyDown={handleStockKeyDown}
                        onBlur={saveStockEdit}
                        className="w-20 h-8 text-sm"
                        autoFocus
                      />
                      {updatingStockId === v.id && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                      onDoubleClick={() => startStockEdit(v)}
                      title="Doble clic para editar"
                    >
                      {updatingStockId === v.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Modificando...</span>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      ) : (
                                                 <span className={`px-2 py-1 rounded text-xs font-medium ${
                           v.stock_unitario <= (v.stock_minimo ?? 0)
                             ? 'bg-red-100 text-red-800' 
                             : v.stock_unitario >= (v.stock_maximo ?? 0)
                             ? 'bg-yellow-100 text-yellow-800'
                             : 'bg-green-100 text-green-800'
                         }`}>
                           {v.stock_unitario}
                         </span>
                      )}
                    </div>
                  )}
                </TableCell>
                                 <TableCell>
                   <span className={`px-2 py-1 rounded text-xs font-medium ${
                     v.stock_unitario <= (v.stock_minimo ?? 0)
                       ? 'bg-red-100 text-red-800' 
                       : 'bg-green-100 text-green-800'
                   }`}>
                     {v.stock_minimo ?? 0}
                   </span>
                 </TableCell>
                                 <TableCell>
                   <span className={`px-2 py-1 rounded text-xs font-medium ${
                     v.stock_unitario >= (v.stock_maximo ?? 0)
                       ? 'bg-yellow-100 text-yellow-800' 
                       : 'bg-blue-100 text-blue-800'
                   }`}>
                     {v.stock_maximo ?? 0}
                   </span>
                 </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEdit(v)} 
                    disabled={isSubmitting || deletingId === v.id || editingStockId !== null || updatingStockId === v.id}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openDeleteModal(v)}
                    disabled={isSubmitting || deletingId === v.id || editingStockId !== null || updatingStockId === v.id}
                  >
                    {deletingId === v.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    ) : (
                      <Trash className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages || 1}</span>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Siguiente</Button>
          </div>
        </div>
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent preventOutsideClose>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar variante" : "Nueva variante"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Artículo</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.fk_id_articulo}
                  onChange={e => setForm(f => ({ ...f, fk_id_articulo: Number(e.target.value) }))}
                  disabled={!!editing}
                >
                  <option value={0}>Seleccionar artículo</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>{a.descripcion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Talle</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.fk_id_talle}
                  onChange={e => setForm(f => ({ ...f, fk_id_talle: Number(e.target.value) }))}
                >
                  <option value={0}>Seleccionar talle</option>
                  {talles.map(t => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={form.fk_id_color}
                  onChange={e => setForm(f => ({ ...f, fk_id_color: Number(e.target.value) }))}
                >
                  <option value={0}>Seleccionar color</option>
                  {colores.map(c => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock unitario</label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock_unitario}
                  onChange={e => setForm(f => ({ ...f, stock_unitario: Number(e.target.value) }))}
                  disabled={!!editing}
                />
              </div>
                             <div>
                 <label className="block text-sm font-medium mb-1">Stock mínimo</label>
                 <Input
                   type="number"
                   min={0}
                   max={form.stock_maximo}
                   value={form.stock_minimo || 0}
                   onChange={e => setForm(f => ({ ...f, stock_minimo: Number(e.target.value) || 0 }))}
                 />
                 {form.stock_minimo > form.stock_maximo && form.stock_maximo > 0 && (
                   <div className="text-red-600 text-xs mt-1">El stock mínimo debe ser menor o igual al stock máximo</div>
                 )}
               </div>
                             <div>
                 <label className="block text-sm font-medium mb-1">Stock máximo</label>
                 <Input
                   type="number"
                   min={form.stock_minimo}
                   value={form.stock_maximo || 0}
                   onChange={e => setForm(f => ({ ...f, stock_maximo: Number(e.target.value) || 0 }))}
                 />
                 {form.stock_maximo < form.stock_minimo && (
                   <div className="text-red-600 text-xs mt-1">El stock máximo debe ser mayor o igual al stock mínimo</div>
                 )}
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">Código de Barras</label>
                 <div className="flex gap-2">
                   <Input
                     type="text"
                     value={form.codigo_barras}
                     onChange={e => setForm(f => ({ ...f, codigo_barras: e.target.value }))}
                     placeholder="Ingrese código o escanee"
                     maxLength={50}
                   />
                   <Button 
                     type="button" 
                     onClick={generarCodigoBarras}
                     variant="outline"
                     disabled={!form.fk_id_articulo || !form.fk_id_talle || !form.fk_id_color}
                     className="whitespace-nowrap"
                   >
                     Generar
                   </Button>
                 </div>
                 <div className="text-xs text-muted-foreground mt-1">
                   Deje vacío para generar automáticamente o ingrese manualmente
                 </div>
               </div>
              {editing && (
                <>
                  <div>
                    <label className="block mb-1 font-medium">Stock nuevo</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.stockNuevo}
                      onChange={e => setForm(f => ({ ...f, stockNuevo: Number(e.target.value) }))}
                    />
                    <div className="text-xs text-muted-foreground mt-1">Al guardar, se sumará al stock actual.</div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Stock a descontar</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.stockDescontar}
                      onChange={e => setForm(f => ({ ...f, stockDescontar: Number(e.target.value) }))}
                    />
                    <div className="text-xs text-muted-foreground mt-1">Al guardar, se restará del stock actual.</div>
                  </div>
                </>
              )}
            </div>
            {errorForm && <div className="text-red-600 text-xs mt-1">{errorForm}</div>}
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editing ? "Modificando..." : "Creando..."}
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-red-500" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              ¿Estás seguro de que quieres eliminar esta variante?
            </p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-sm">{varianteToDelete?.descripcion}</p>
            </div>
            <p className="text-xs text-red-600 mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              disabled={deletingId === varianteToDelete?.id}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deletingId === varianteToDelete?.id}
            >
              {deletingId === varianteToDelete?.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <div className="text-red-600 text-xs mt-2">{error}</div>}

      {/* Generador de etiquetas de códigos de barras */}
      {showBarcodeGenerator && (
        <BarcodeLabelGenerator
          variantes={variantes}
          onClose={() => setShowBarcodeGenerator(false)}
        />
      )}
    </div>
  );
} 