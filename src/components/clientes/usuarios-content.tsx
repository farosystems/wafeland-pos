"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from "@/services/usuarios";
import { Usuario, CreateUsuarioData } from "@/types/usuario";
import { User, Plus, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";

const ROLES = [
  { label: "Vendedor", value: "vendedor" },
  { label: "Cobrador", value: "cobrador" },
  { label: "Supervisor", value: "supervisor" },
];

const allowedRoles = ["vendedor", "cobrador", "supervisor"] as const;

export function UsuariosContent() {
  const { user } = useUser();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
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
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);

  const fetchAllAndCurrent = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const all = await getUsuarios();
      setUsuarios(all);
      if (user?.emailAddresses?.[0]?.emailAddress) {
        const emailClerk = normalizeEmail(user.emailAddresses[0].emailAddress);
        const actual = all.find(u => normalizeEmail(u.email) === emailClerk);
        setUsuarioActual(actual || null);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      setError((error as Error).message);
    }
    setLoading(false);
  }, [user]);
  useEffect(() => {
    fetchAllAndCurrent();
  }, [fetchAllAndCurrent]);

  // Helper para normalizar emails
  function normalizeEmail(email?: string | null) {
    return (email || '').trim().toLowerCase();
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
      await fetchAllAndCurrent();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      setFormError((error as Error).message);
    }
    setLoading(false);
  }
  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar usuario?")) return;
    setLoading(true);
    try { await deleteUsuario(id); await fetchAllAndCurrent(); } catch (error) { 
      console.error("Error al eliminar usuario:", error);
      setError((error as Error).message); 
    }
    setLoading(false);
  }
  // Filtrado según rol
  const usuariosAMostrar = usuarioActual?.rol === "supervisor"
    ? usuarios
    : usuarioActual
      ? usuarios.filter(u => normalizeEmail(u.email) === normalizeEmail(usuarioActual.email))
      : [];
  // Solo permitir alta/edición si es supervisor
  const puedeEditar = usuarioActual?.rol === "supervisor";
  // Modal de solo lectura para no supervisores
  const soloLectura = !puedeEditar && !!editing;
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
        {puedeEditar && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" preventOutsideClose>
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
                  <input type="text" className="w-full border rounded px-2 py-1" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required disabled={soloLectura} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Email</label>
                  <input type="email" className="w-full border rounded px-2 py-1" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required disabled={soloLectura} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Teléfono</label>
                  <input type="text" className="w-full border rounded px-2 py-1" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} required disabled={soloLectura} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Contraseña</label>
                  <input type="password" className="w-full border rounded px-2 py-1" value={form.password_hash} onChange={e => setForm(f => ({ ...f, password_hash: e.target.value }))} required minLength={6} disabled={soloLectura} />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Rol</label>
                  <select className="w-full border rounded px-2 py-1" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value as typeof allowedRoles[number] }))} required disabled={soloLectura}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  {!soloLectura && (
                    <Button type="submit" disabled={loading}>
                      {editing ? "Guardar" : "Crear"}
                    </Button>
                  )}
                  <Button type="button" variant="outline" className="ml-2" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                    Cancelar
                  </Button>
                </div>
                {formError && <div className="col-span-2 text-red-600 text-sm">{formError}</div>}
              </form>
            </DialogContent>
          </Dialog>
        )}
        {/* Modal solo lectura para no supervisores */}
        {!puedeEditar && editing !== null && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px]" preventOutsideClose>
              <DialogHeader>
                <DialogTitle>Ver Usuario</DialogTitle>
                <DialogDescription>Visualiza los datos del usuario seleccionado.</DialogDescription>
              </DialogHeader>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Nombre</label>
                  <input type="text" className="w-full border rounded px-2 py-1" value={form.nombre} disabled />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Email</label>
                  <input type="email" className="w-full border rounded px-2 py-1" value={form.email} disabled />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Teléfono</label>
                  <input type="text" className="w-full border rounded px-2 py-1" value={form.telefono} disabled />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Contraseña</label>
                  <input type="password" className="w-full border rounded px-2 py-1" value={form.password_hash} disabled />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Rol</label>
                  <input type="text" className="w-full border rounded px-2 py-1" value={form.rol} disabled />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" className="ml-2" onClick={() => setIsDialogOpen(false)}>
                    Cerrar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
            {usuariosAMostrar.map((u) => (
              <tr key={u.id} className="border-b hover:bg-blue-50 transition-colors">
                <td className="px-2 py-1 align-middle">{u.id}</td>
                <td className="px-2 py-1 align-middle">{u.nombre}</td>
                <td className="px-2 py-1 align-middle">{u.email}</td>
                <td className="px-2 py-1 align-middle">{u.telefono}</td>
                <td className="px-2 py-1 align-middle">{u.rol}</td>
                <td className="px-2 py-1 align-middle">{new Date(u.creado_el).toLocaleString()}</td>
                <td className="px-2 py-1 text-center align-middle">
                  {puedeEditar ? (
                    <>
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
                    </>
                  ) : (
                    <button
                      className="text-gray-600 hover:text-blue-800 p-1"
                      onClick={() => openEdit(u)}
                      disabled={loading}
                      title="Ver"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 