"use client";
import * as React from "react";
import { useVariantes } from "@/hooks/use-variantes";
import { useArticles } from "@/hooks/use-articles";
import { useTalles } from "@/hooks/use-talles";
import { useColores } from "@/hooks/use-colores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash, Plus, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Variante } from "@/types/variante";
import { createMovimientoStock } from "@/services/movimientosStock";
import { updateArticle } from "@/services/articles";
import { getVariantes } from "@/services/variantes";

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
    stockNuevo: 0,
    stockDescontar: 0,
  });
  const [errorForm, setErrorForm] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [varianteToDelete, setVarianteToDelete] = React.useState<{ id: number, fk_id_articulo: number, descripcion: string } | null>(null);
  const [editingStockId, setEditingStockId] = React.useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = React.useState<string>("");
  const [updatingStockId, setUpdatingStockId] = React.useState<number | null>(null);

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

  // Abrir dialog para crear o editar
  const openNew = () => {
    setEditing(null);
    setForm({ fk_id_articulo: 0, fk_id_talle: 0, fk_id_color: 0, stock_unitario: 0, stockNuevo: 0, stockDescontar: 0 });
    setShowDialog(true);
  };
  const openEdit = (v: Variante) => {
    setEditing(v);
    setForm({
      fk_id_articulo: v.fk_id_articulo,
      fk_id_talle: v.fk_id_talle,
      fk_id_color: v.fk_id_color,
      stock_unitario: v.stock_unitario,
      stockNuevo: 0,
      stockDescontar: 0,
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
    
    setIsSubmitting(true);
    setErrorForm("");
    
    try {
      let newStock = form.stock_unitario + form.stockNuevo - form.stockDescontar;
      if (newStock < 0) newStock = 0;
      
      if (editing) {
        await editVariante(editing.id, {
          stock_unitario: newStock,
          fk_id_talle: form.fk_id_talle,
          fk_id_color: form.fk_id_color,
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
          });
        }
      } else {
        await addVariante({
          fk_id_articulo: form.fk_id_articulo,
          fk_id_talle: form.fk_id_talle,
          fk_id_color: form.fk_id_color,
          stock_unitario: newStock,
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
        <Button 
          onClick={openNew} 
          className="bg-primary hover:bg-primary/90"
          disabled={isSubmitting || deletingId !== null || editingStockId !== null || updatingStockId !== null}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva variante
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Artículo</TableHead>
              <TableHead>Talle</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Stock unitario</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variantesPaginadas.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center">No hay variantes.</TableCell></TableRow>
            ) : variantesPaginadas.map(v => (
              <TableRow key={v.id}>
                <TableCell>{v.id}</TableCell>
                <TableCell>{v.articulo_descripcion}</TableCell>
                <TableCell>{v.talle_descripcion}</TableCell>
                <TableCell>{v.color_descripcion}</TableCell>
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
                        v.stock_unitario
                      )}
                    </div>
                  )}
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
    </div>
  );
} 