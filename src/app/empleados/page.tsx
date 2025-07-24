"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Plus, Eye, Edit } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getEmpleados,
  createEmpleado,
  updateEmpleado,
} from "@/services/empleados";
import { CreateEmpleadoData } from "@/types/empleado";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Empleado } from "@/types/empleado";

export default function EmpleadosPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Partial<CreateEmpleadoData>>({
    nombre: "",
    apellido: "",
    sueldo: undefined,
    tope_adelanto: undefined,
    tipo_liquidacion: "semanal",
    dni: undefined,
    telefono: undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [showViewDialog, setShowViewDialog] = useState<{ open: boolean, empleado: Empleado | null }>({ open: false, empleado: null });
  const [showEditDialog, setShowEditDialog] = useState<{ open: boolean, empleado: Empleado | null }>({ open: false, empleado: null });
  const [editForm, setEditForm] = useState<Partial<Empleado>>({
    nombre: "",
    apellido: "",
    sueldo: undefined,
    tope_adelanto: undefined,
    tipo_liquidacion: "semanal",
    dni: undefined,
    telefono: undefined,
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getEmpleados()
      .then(data => setEmpleados(data))
      .catch(() => setEmpleados([]))
      .finally(() => setLoading(false));
  }, []);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver los empleados.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }

  const handleOpenDialog = () => {
    setForm({
      nombre: "",
      apellido: "",
      sueldo: undefined,
      tope_adelanto: undefined,
      tipo_liquidacion: "semanal",
      dni: undefined,
      telefono: undefined,
    });
    setFormError(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.apellido || !form.tipo_liquidacion) {
      setFormError("Completa los campos obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const nuevo = await createEmpleado(form as CreateEmpleadoData);
      setEmpleados(prev => [nuevo, ...prev]);
      setShowDialog(false);
    } catch (err: any) {
      setFormError(err.message || "Error al guardar empleado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-8 mt-6">
      <div className="flex flex-col items-start">
        <BreadcrumbBar />
        <div className="flex items-center gap-3 mb-4 pl-6">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Empleados</h1>
        </div>
        <p className="pl-6 text-gray-600 mb-6">
          Administra los empleados de tu comercio, consulta el historial y registra nuevas operaciones.
        </p>
      </div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleOpenDialog} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Empleado
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center mt-8">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4">
            <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead>Sueldo</TableHead>
                <TableHead>Tope adelanto</TableHead>
                <TableHead>Tipo liquidación</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Creado el</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No hay empleados registrados.
                  </TableCell>
                </TableRow>
              ) : (
                empleados.map(emp => (
                  <TableRow key={emp.id} className="border-b hover:bg-blue-50 transition-colors">
                    <TableCell>{emp.id}</TableCell>
                    <TableCell>{emp.nombre ?? "-"}</TableCell>
                    <TableCell>{emp.apellido ?? "-"}</TableCell>
                    <TableCell>{emp.sueldo !== null && emp.sueldo !== undefined ? `$${emp.sueldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : "-"}</TableCell>
                    <TableCell>{emp.tope_adelanto !== null && emp.tope_adelanto !== undefined ? `${emp.tope_adelanto}%` : "-"}</TableCell>
                    <TableCell>{emp.tipo_liquidacion ?? "-"}</TableCell>
                    <TableCell>{emp.dni ?? "-"}</TableCell>
                    <TableCell>{emp.telefono ?? "-"}</TableCell>
                    <TableCell>{emp.creado_el ? new Date(emp.creado_el).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <button
                        title="Ver"
                        className="p-2 rounded shadow-sm hover:bg-gray-100 text-blue-600 mr-2 cursor-pointer"
                        onClick={() => setShowViewDialog({ open: true, empleado: emp })}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        title="Editar"
                        className="p-2 rounded shadow-sm hover:bg-gray-100 text-green-600 cursor-pointer"
                        onClick={() => {
                          setEditForm({ ...emp });
                          setShowEditDialog({ open: true, empleado: emp });
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent preventOutsideClose>
          <DialogHeader>
            <DialogTitle>Nuevo empleado</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 font-medium">Nombre *</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={form.nombre ?? ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Apellido *</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={form.apellido ?? ''} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Sueldo</label>
                <input type="number" className="w-full border rounded px-2 py-1" value={form.sueldo ?? ''} onChange={e => setForm(f => ({ ...f, sueldo: e.target.value === '' ? undefined : parseFloat(e.target.value) }))} min={0} step={0.01} />
              </div>
              <div>
                <label className="block mb-1 font-medium">Tope adelanto (%)</label>
                <div className="relative">
                  <input type="number" className="w-full border rounded px-2 py-1 pr-8" value={form.tope_adelanto ?? ''} onChange={e => setForm(f => ({ ...f, tope_adelanto: e.target.value === '' ? undefined : parseFloat(e.target.value) }))} min={0} max={100} step={0.01} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Tipo liquidación *</label>
                <select className="w-full border rounded px-2 py-1" value={form.tipo_liquidacion ?? ''} onChange={e => setForm(f => ({ ...f, tipo_liquidacion: e.target.value as 'semanal' | 'quincenal' | 'mensual' }))} required>
                  <option value="semanal">semanal</option>
                  <option value="quincenal">quincenal</option>
                  <option value="mensual">mensual</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">DNI</label>
                <input type="number" className="w-full border rounded px-2 py-1" value={form.dni ?? ''} onChange={e => setForm(f => ({ ...f, dni: e.target.value === '' ? undefined : parseInt(e.target.value) }))} min={0} />
              </div>
              <div>
                <label className="block mb-1 font-medium">Teléfono</label>
                <input type="number" className="w-full border rounded px-2 py-1" value={form.telefono ?? ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value === '' ? undefined : parseInt(e.target.value) }))} min={0} />
              </div>
            </div>
            {formError && <div className="text-red-600 text-sm">{formError}</div>}
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Popup ver empleado */}
      <Dialog open={showViewDialog.open} onOpenChange={open => setShowViewDialog(s => ({ ...s, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ver empleado</DialogTitle>
          </DialogHeader>
          {showViewDialog.empleado && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div><span className="font-medium">Nombre:</span> {showViewDialog.empleado.nombre}</div>
              <div><span className="font-medium">Apellido:</span> {showViewDialog.empleado.apellido}</div>
              <div><span className="font-medium">Sueldo:</span> {showViewDialog.empleado.sueldo !== null && showViewDialog.empleado.sueldo !== undefined ? `$${showViewDialog.empleado.sueldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : '-'}</div>
              <div><span className="font-medium">Tope adelanto:</span> {showViewDialog.empleado.tope_adelanto !== null && showViewDialog.empleado.tope_adelanto !== undefined ? `${showViewDialog.empleado.tope_adelanto}%` : '-'}</div>
              <div><span className="font-medium">Tipo liquidación:</span> {showViewDialog.empleado.tipo_liquidacion}</div>
              <div><span className="font-medium">DNI:</span> {showViewDialog.empleado.dni ?? '-'}</div>
              <div><span className="font-medium">Teléfono:</span> {showViewDialog.empleado.telefono ?? '-'}</div>
              <div><span className="font-medium">Creado el:</span> {showViewDialog.empleado.creado_el ? new Date(showViewDialog.empleado.creado_el).toLocaleDateString() : '-'}</div>
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowViewDialog({ open: false, empleado: null })}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Popup editar empleado */}
      <Dialog open={showEditDialog.open} onOpenChange={open => setShowEditDialog(s => ({ ...s, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
          </DialogHeader>
          {showEditDialog.empleado && (
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!editForm.nombre || !editForm.apellido || !editForm.tipo_liquidacion) {
                  setEditFormError("Completa los campos obligatorios.");
                  return;
                }
                setLoading(true);
                try {
                  const updatedEmpleado = await updateEmpleado(showEditDialog.empleado!.id, editForm as Partial<CreateEmpleadoData>);
                  setEmpleados(prev => prev.map(emp => emp.id === updatedEmpleado.id ? updatedEmpleado : emp));
                  setShowEditDialog({ open: false, empleado: null });
                } catch (err: any) {
                  setEditFormError(err.message || "Error al editar empleado");
                } finally {
                  setLoading(false);
                }
              }}
              className="flex flex-col gap-3 mt-2"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Nombre *</label>
                  <input type="text" className="w-full border rounded px-2 py-1" value={editForm.nombre ?? ''} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Apellido *</label>
                  <input type="text" className="w-full border rounded px-2 py-1" value={editForm.apellido ?? ''} onChange={e => setEditForm(f => ({ ...f, apellido: e.target.value }))} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Sueldo</label>
                  <input type="number" className="w-full border rounded px-2 py-1" value={editForm.sueldo ?? ''} onChange={e => setEditForm(f => ({ ...f, sueldo: e.target.value === '' ? undefined : parseFloat(e.target.value) }))} min={0} step={0.01} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Tope adelanto (%)</label>
                  <div className="relative">
                    <input type="number" className="w-full border rounded px-2 py-1 pr-8" value={editForm.tope_adelanto ?? ''} onChange={e => setEditForm(f => ({ ...f, tope_adelanto: e.target.value === '' ? undefined : parseFloat(e.target.value) }))} min={0} max={100} step={0.01} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Tipo liquidación *</label>
                  <select 
                    className="w-full border rounded px-2 py-1" 
                    value={editForm.tipo_liquidacion ?? ''} 
                    onChange={e => setEditForm(f => ({ ...f, tipo_liquidacion: e.target.value as 'semanal' | 'quincenal' | 'mensual' }))} 
                    required
                  >
                    <option value="semanal">semanal</option>
                    <option value="quincenal">quincenal</option>
                    <option value="mensual">mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">DNI</label>
                  <input type="number" className="w-full border rounded px-2 py-1" value={editForm.dni ?? ''} onChange={e => setEditForm(f => ({ ...f, dni: e.target.value === '' ? undefined : parseInt(e.target.value) }))} min={0} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Teléfono</label>
                  <input type="number" className="w-full border rounded px-2 py-1" value={editForm.telefono ?? ''} onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value === '' ? undefined : parseInt(e.target.value) }))} min={0} />
                </div>
              </div>
              {editFormError && <div className="text-red-600 text-sm">{editFormError}</div>}
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog({ open: false, empleado: null })}>Cancelar</Button>
                <Button type="submit">Guardar cambios</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 