"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from "@/services/usuarios";
import { Usuario, CreateUsuarioData } from "@/types/usuario";
import { User, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ROLES = [
  { label: "Vendedor", value: "vendedor" },
  { label: "Cobrador", value: "cobrador" },
  { label: "Supervisor", value: "supervisor" },
];

const allowedRoles = ["vendedor", "cobrador", "supervisor"] as const;

export function UsuariosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState<CreateUsuarioData>({
    nombre: "",
    email: "",
    telefono: "",
    password_hash: "",
    rol: "vendedor",
    prueba_gratis: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);
  async function fetchAll() {
    setLoading(true); setError(null);
    try { setUsuarios(await getUsuarios()); } catch (error) { 
      console.error("Error al cargar usuarios:", error);
      setError((error as Error).message); 
    }
    setLoading(false);
  }
  function openNew() {
    setEditing(null);
    setForm({
      nombre: "",
      email: "",
      telefono: "",
      password_hash: "",
      rol: "vendedor",
      prueba_gratis: false,
    });
    setFormError(null);
    setIsDialogOpen(true);
  }
  function openEdit(usuario: Usuario) {
    setEditing(usuario);
    setForm({ ...usuario });
    setFormError(null);
    setIsDialogOpen(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.nombre) return setFormError("El nombre es obligatorio");
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return setFormError("Email inv\u00e1lido");
    if (!form.telefono) return setFormError("El tel\u00e9fono es obligatorio");
    if (!form.password_hash || form.password_hash.length < 6) return setFormError("La contraseña debe tener al menos 6 caracteres");
    setLoading(true);
    try {
      if (editing) {
        const updateData: Partial<CreateUsuarioData> = {};
        if (typeof form.nombre === 'string') updateData.nombre = form.nombre;
        if (typeof form.email === 'string') updateData.email = form.email;
        if (typeof form.telefono === 'string') updateData.telefono = form.telefono;
        if (typeof form.password_hash === 'string') updateData.password_hash = form.password_hash;
        if (typeof form.rol === 'string') updateData.rol = form.rol;
        await updateUsuario(editing.id, updateData);
      } else {
        const createData: CreateUsuarioData = {
          nombre: String(form.nombre),
          email: String(form.email),
          telefono: String(form.telefono),
          password_hash: String(form.password_hash),
          rol: allowedRoles.includes(form.rol as typeof allowedRoles[number]) ? form.rol as typeof allowedRoles[number] : "vendedor",
          prueba_gratis: form.prueba_gratis ?? false,
        };
        await createUsuario(createData);
      }
      setIsDialogOpen(false);
      await fetchAll();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      setFormError((error as Error).message);
    }
    setLoading(false);
  }
  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar usuario?")) return;
    setLoading(true);
    try { await deleteUsuario(id); await fetchAll(); } catch (error) { 
      console.error("Error al eliminar usuario:", error);
      setError((error as Error).message); 
    }
    setLoading(false);
  }
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Usuarios</h1>
            <p className="text-muted-foreground">
              Gestiona los usuarios del sistema
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Usuario" : "Nuevo Usuario"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Modifica la información del usuario seleccionado."
                  : "Completa la información para crear un nuevo usuario."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Nombre</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <input type="email" className="w-full border rounded px-2 py-1" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Teléfono</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Contraseña</label>
                <input type="password" className="w-full border rounded px-2 py-1" value={form.password_hash} onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))} required minLength={6} />
              </div>
              <div>
                <label className="block mb-1 font-medium">Rol</label>
                <select className="w-full border rounded px-2 py-1" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as typeof allowedRoles[number] }))} required>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={loading}>
                  {editing ? "Guardar" : "Crear"}
                </Button>
                <Button type="button" variant="outline" className="ml-2" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
              </div>
              {formError && <div className="col-span-2 text-red-600 text-sm">{formError}</div>}
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="rounded-lg border bg-card p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">ID</th>
              <th className="px-2 py-1 text-left">Nombre</th>
              <th className="px-2 py-1 text-left">Email</th>
              <th className="px-2 py-1 text-left">Teléfono</th>
              <th className="px-2 py-1 text-left">Rol</th>
              <th className="px-2 py-1 text-left">Creado el</th>
              <th className="px-2 py-1 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b hover:bg-blue-50 transition-colors">
                <td className="px-2 py-1 align-middle">{u.id}</td>
                <td className="px-2 py-1 align-middle">{u.nombre}</td>
                <td className="px-2 py-1 align-middle">{u.email}</td>
                <td className="px-2 py-1 align-middle">{u.telefono}</td>
                <td className="px-2 py-1 align-middle">{u.rol}</td>
                <td className="px-2 py-1 align-middle">{new Date(u.creado_el).toLocaleString()}</td>
                <td className="px-2 py-1 text-center align-middle">
                  <button
                    className="text-blue-600 hover:text-blue-800 p-1"
                    onClick={() => openEdit(u)}
                    disabled={loading}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 p-1 ml-2"
                    onClick={() => handleDelete(u.id)}
                    disabled={loading}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 