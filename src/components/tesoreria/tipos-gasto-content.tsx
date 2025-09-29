"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getTiposGasto,
  createTipoGasto,
  updateTipoGasto,
  deleteTipoGasto,
} from "@/services/tiposGasto";
import { TipoGasto, CreateTipoGastoData } from "@/types/tipoGasto";

export function TiposGastoContent() {
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoGasto | null>(null);
  // Estado inicial del formulario
  const initialForm: CreateTipoGastoData = {
    descripcion: "",
    obliga_empleado: false,
    afecta_caja: false,
    tipo_movimiento: null,
  };
  const [form, setForm] = useState<CreateTipoGastoData>(initialForm);

  const fetchTiposGasto = async () => {
    try {
      setLoading(true);
      const data = await getTiposGasto();
      setTiposGasto(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiposGasto();
  }, []);

  const handleSave = async () => {
    try {
      // Crear una copia del formulario
      const formData = { ...form };

      if (editing) {
        await updateTipoGasto(editing.id, formData);
      } else {
        await createTipoGasto(formData);
      }
      setIsDialogOpen(false);
      fetchTiposGasto();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este tipo de movimiento?")) {
      try {
        await deleteTipoGasto(id);
        fetchTiposGasto();
      } catch {}
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Tipos de Movimientos</h2>
        <Button onClick={() => { setEditing(null); setForm(initialForm); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Tipo de Movimiento
        </Button>
      </div>
      {loading && <Loader2 className="animate-spin" />}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="rounded-lg border bg-card p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left">ID</th>
                <th className="px-2 py-1 text-left">Descripción</th>
                <th className="px-2 py-1 text-left">Tipo</th>
                <th className="px-2 py-1 text-left">Obliga Empleado</th>
                <th className="px-2 py-1 text-left">Afecta Caja</th>
                <th className="px-2 py-1 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tiposGasto.map((tipo) => (
                <tr key={tipo.id} className="border-b">
                  <td className="px-2 py-1">{tipo.id}</td>
                  <td className="px-2 py-1">{tipo.descripcion}</td>
                  <td className="px-2 py-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tipo.tipo_movimiento === 'ingreso'
                        ? 'bg-green-100 text-green-800'
                        : tipo.tipo_movimiento === 'egreso'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tipo.tipo_movimiento === 'ingreso' ? 'Ingreso' :
                       tipo.tipo_movimiento === 'egreso' ? 'Egreso' : 'No definido'}
                    </span>
                  </td>
                  <td className="px-2 py-1">{tipo.obliga_empleado ? "Sí" : "No"}</td>
                  <td className="px-2 py-1">{tipo.afecta_caja ? "Sí" : "No"}</td>
                  <td className="px-2 py-1 text-center">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditing(tipo);
                      setForm({
                        descripcion: tipo.descripcion,
                        obliga_empleado: tipo.obliga_empleado,
                        afecta_caja: tipo.afecta_caja,
                        tipo_movimiento: tipo.tipo_movimiento || null
                      });
                      setIsDialogOpen(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tipo.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent preventOutsideClose>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nuevo"} Tipo de Movimiento</DialogTitle>
            <DialogDescription>
              Completa la información del tipo de movimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block mb-1 font-medium">Descripción</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                value={form.descripcion || ""}
                onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Tipo de Movimiento</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.tipo_movimiento || ""}
                onChange={(e) => setForm(f => ({ ...f, tipo_movimiento: e.target.value as 'ingreso' | 'egreso' | null || null }))}
              >
                <option value="">Seleccionar tipo</option>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="obliga_empleado"
                checked={!!form.obliga_empleado}
                onChange={(e) => setForm(f => ({ ...f, obliga_empleado: e.target.checked }))}
              />
              <label htmlFor="obliga_empleado">¿Obliga seleccionar un empleado?</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="afecta_caja"
                checked={!!form.afecta_caja}
                onChange={e => setForm(f => ({ ...f, afecta_caja: e.target.checked }))}
                className="ml-2"
              />
              <label htmlFor="afecta_caja">¿Afecta a la caja?</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 