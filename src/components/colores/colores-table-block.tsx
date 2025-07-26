"use client";
import * as React from "react";
import { IconPalette } from "@tabler/icons-react";
import { useColores } from "@/hooks/use-colores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Color } from "@/types/color";

export function ColoresTableBlock() {
  const { colores, addColor, editColor, deleteColor, error } = useColores();
  const [filter, setFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState({ id: true, creado_el: true, descripcion: true });
  const [showDialog, setShowDialog] = React.useState(false);
  const [descripcion, setDescripcion] = React.useState("");
  const [editId, setEditId] = React.useState<number | null>(null);
  const [errorForm, setErrorForm] = React.useState("");

  const filtered = colores.filter(c =>
    (columnVisibility.id && c.id.toString().includes(filter)) ||
    (columnVisibility.descripcion && c.descripcion.toLowerCase().includes(filter.toLowerCase()))
  );

  const handleEdit = (color: Color) => {
    setEditId(color.id);
    setDescripcion(color.descripcion);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditId(null);
    setDescripcion("");
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Eliminar color?")) deleteColor(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setErrorForm("La descripción es requerida");
      return;
    }
    setErrorForm("");
    if (editId) {
      await editColor(editId, { descripcion });
    } else {
      await addColor({ descripcion });
    }
    setShowDialog(false);
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <IconPalette className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">Colores</h2>
        <Button size="sm" onClick={handleNew} className="ml-auto">Nuevo color</Button>
      </div>
      <div className="flex gap-2 mb-2">
        <Input placeholder="Filtrar por ID o descripción..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-xs" />
        <Button variant="outline" size="sm" onClick={() => setColumnVisibility(v => ({ ...v, id: !v.id }))}>ID</Button>
        <Button variant="outline" size="sm" onClick={() => setColumnVisibility(v => ({ ...v, creado_el: !v.creado_el }))}>Fecha</Button>
        <Button variant="outline" size="sm" onClick={() => setColumnVisibility(v => ({ ...v, descripcion: !v.descripcion }))}>Descripción</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columnVisibility.id && <TableHead>ID</TableHead>}
            {columnVisibility.creado_el && <TableHead>Fecha creación</TableHead>}
            {columnVisibility.descripcion && <TableHead>Descripción</TableHead>}
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={4} className="text-center">No hay colores.</TableCell></TableRow>
          ) : filtered.map(color => (
            <TableRow key={color.id}>
              {columnVisibility.id && <TableCell>{color.id}</TableCell>}
              {columnVisibility.creado_el && <TableCell>{new Date(color.creado_el).toLocaleString()}</TableCell>}
              {columnVisibility.descripcion && <TableCell>{color.descripcion}</TableCell>}
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(color)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(color.id)}><Trash className="h-4 w-4 text-red-500" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent preventOutsideClose>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar color" : "Nuevo color"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción" />
            {errorForm && <div className="text-red-600 text-xs">{errorForm}</div>}
            <DialogFooter>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
    </div>
  );
} 