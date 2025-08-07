"use client";
import * as React from "react";
import { Plus, FileText, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getTiposComprobantes, createTipoComprobante, updateTipoComprobante, deleteTipoComprobante } from "@/services/tiposComprobantes";
import { TipoComprobante } from "@/types/tipoComprobante";

export function TiposComprobantesContent() {
  const [tipos, setTipos] = React.useState<TipoComprobante[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TipoComprobante | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchTipos = async () => {
    setError(null);
    try {
      const data = await getTiposComprobantes();
      setTipos(data);
    } catch (error) {
      console.error("Error al cargar tipos de comprobante:", error);
      setError("Error al cargar tipos de comprobante");
    }
  };

  React.useEffect(() => { fetchTipos(); }, [fetchTipos]);

  const openCreateDialog = () => { setEditing(null); setIsDialogOpen(true); };
  const openEditDialog = (tipo: TipoComprobante) => { setEditing(tipo); setIsDialogOpen(true); };
  const closeDialog = () => { setIsDialogOpen(false); setEditing(null); };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const descripcion = formData.get("descripcion") as string;
    const descuenta_stock = formData.get("descuenta_stock") === "on";
    const reingresa_stock = formData.get("reingresa_stock") === "on";
    const admite_impuestos = formData.get("admite_impuestos") === "on";
    const imprime_pdf = formData.get("imprime_pdf") === "on";
    const activo = formData.get("activo") === "on";

    try {
      if (editing) {
        const updateData: Partial<TipoComprobante> = {};
        if (typeof descripcion === 'string') updateData.descripcion = descripcion;
        updateData.descuenta_stock = descuenta_stock;
        updateData.reingresa_stock = reingresa_stock;
        updateData.admite_impuestos = admite_impuestos;
        updateData.imprime_pdf = imprime_pdf;
        updateData.activo = activo;
        await updateTipoComprobante(editing.id, updateData);
      } else {
        const createData = {
          descripcion: String(descripcion),
          descuenta_stock: descuenta_stock,
          reingresa_stock: reingresa_stock,
          admite_impuestos: admite_impuestos,
          imprime_pdf: imprime_pdf,
          activo: activo,
        };
        await createTipoComprobante(createData);
      }
      await fetchTipos();
      closeDialog();
    } catch (error) {
      console.error("Error al guardar tipo de comprobante:", error);
      setError("Error al guardar");
    }
    setIsLoading(false);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar tipo de comprobante?")) return;
    setIsLoading(true);
    try {
      await deleteTipoComprobante(id);
      await fetchTipos();
    } catch (error) {
      console.error("Error al eliminar tipo de comprobante:", error);
      setError("Error al eliminar");
    }
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <h2 className="text-2xl font-bold">Tipos de comprobantes</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar tipo de comprobante" : "Nuevo tipo de comprobante"}</DialogTitle>
              <DialogDescription>
                {editing ? "Modifica los datos del tipo de comprobante." : "Completa los datos para crear un nuevo tipo."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input name="descripcion" defaultValue={editing?.descripcion || ""} placeholder="Descripción" className="border rounded px-2 py-1" required />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="descuenta_stock" defaultChecked={!!editing?.descuenta_stock} />
                Descuenta stock
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="reingresa_stock" defaultChecked={!!editing?.reingresa_stock} />
                Reingresa stock
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="imprime_pdf" defaultChecked={!!editing?.imprime_pdf} />
                Imprime PDF
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="activo" defaultChecked={editing?.activo !== false} />
                Activo
              </label>
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="rounded-lg border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">ID</th>
              <th className="px-2 py-1 text-left">Descripción</th>
              <th className="px-2 py-1 text-left">Descuenta stock</th>
              <th className="px-2 py-1 text-left">Reingresa stock</th>
              <th className="px-2 py-1 text-left">Imprime PDF</th>
              <th className="px-2 py-1 text-left">Activo</th>
              <th className="px-2 py-1 text-left">Creado el</th>
              <th className="px-2 py-1 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((t) => (
              <tr key={t.id} className="border-b hover:bg-blue-50 transition-colors">
                <td className="px-2 py-1">{t.id}</td>
                <td className="px-2 py-1">{t.descripcion}</td>
                <td className="px-2 py-1">{t.descuenta_stock ? "Sí" : "No"}</td>
                <td className="px-2 py-1">{t.reingresa_stock ? "Sí" : "No"}</td>
                <td className="px-2 py-1">{t.imprime_pdf ? "Sí" : "No"}</td>
                <td className="px-2 py-1">{t.activo ? "Sí" : "No"}</td>
                <td className="px-2 py-1">{t.creado_el?.slice(0, 19).replace('T', ' ')}</td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(t)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(t.id)}>
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {tipos.length === 0 && (
              <tr><td colSpan={8} className="text-center py-4 text-muted-foreground">No hay tipos de comprobante.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 