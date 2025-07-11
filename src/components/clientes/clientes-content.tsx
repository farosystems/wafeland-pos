"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { getClientes, createCliente, updateCliente, deleteCliente } from "@/services/clientes";
import { Cliente, CreateClienteData } from "@/types/cliente";
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

const TIPO_DOCS = [
  { label: "DNI", value: "dni" },
  { label: "CUIT", value: "cuit" },
  { label: "CUIL", value: "cuil" },
];
const TIPO_PERSONA = [
  { label: "Cliente", value: "cliente" },
  { label: "Proveedor", value: "proveedor" },
];
const CATEGORIAS_IVA = [
  "Consumidor Final",
  "Responsable Inscripto",
  "Responsable Monotributo",
  "Exento",
  "No Responsable",
  "Sujeto no Categorizado",
];

function validarDocumento(tipo: string, valor: string) {
  if (tipo === "dni") return /^\d{7,8}$/.test(valor);
  if (tipo === "cuit") return /^\d{11}$/.test(valor) && validarCuit(valor);
  if (tipo === "cuil") return /^\d{11}$/.test(valor);
  return false;
}
function validarCuit(cuit: string) {
  // Algoritmo de validación de CUIT argentino
  if (!/^\d{11}$/.test(cuit)) return false;
  const mult = [5,4,3,2,7,6,5,4,3,2];
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += parseInt(cuit[i]) * mult[i];
  const resto = suma % 11;
  const digito = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return digito === parseInt(cuit[10]);
}

export function ClientesContent() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState<CreateClienteData>({
    razon_social: "",
    tipo: "cliente",
    email: "",
    tipo_doc: "dni",
    num_doc: "",
    telefono: "",
    categoria_iva: "Consumidor Final",
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);
  async function fetchAll() {
    setLoading(true); setError(null);
    try { setClientes(await getClientes()); } catch (error) { 
      console.error("Error al cargar clientes:", error);
      setError((error as Error).message); 
    }
    setLoading(false);
  }
  function openNew() {
    setEditing(null);
    setForm({
      razon_social: "",
      tipo: "cliente",
      email: "",
      tipo_doc: "dni",
      num_doc: "",
      telefono: "",
      categoria_iva: "Consumidor Final",
    });
    setFormError(null);
    setIsDialogOpen(true);
  }
  function openEdit(cliente: Cliente) {
    setEditing(cliente);
    setForm({ ...cliente });
    setFormError(null);
    setIsDialogOpen(true);
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.razon_social) return setFormError("La razón social es obligatoria");
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return setFormError("Email inválido");
    if (!form.telefono) return setFormError("El teléfono es obligatorio");
    if (!form.num_doc || !validarDocumento(form.tipo_doc, form.num_doc)) {
      if (form.tipo_doc === "dni") return setFormError("DNI inválido (7 u 8 dígitos)");
      if (form.tipo_doc === "cuit") return setFormError("CUIT inválido");
      if (form.tipo_doc === "cuil") return setFormError("CUIL inválido (11 dígitos)");
      return setFormError("Documento inválido");
    }
    setLoading(true);
    try {
      if (editing) {
        await updateCliente(editing.id, form);
      } else {
        await createCliente(form);
      }
      setIsDialogOpen(false);
      await fetchAll();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      setFormError((error as Error).message);
    }
    setLoading(false);
  }
  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar cliente?")) return;
    setLoading(true);
    try { await deleteCliente(id); await fetchAll(); } catch (error) { 
      console.error("Error al eliminar cliente:", error);
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
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">
              Gestiona tus clientes y proveedores
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Modifica la información del cliente seleccionado."
                  : "Completa la información para crear un nuevo cliente."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Razón Social</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={form.razon_social} onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Tipo</label>
                <select className="w-full border rounded px-2 py-1" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))} required>
                  {TIPO_PERSONA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <input type="email" className="w-full border rounded px-2 py-1" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Tipo Doc</label>
                <select className="w-full border rounded px-2 py-1" value={form.tipo_doc} onChange={e => setForm(f => ({ ...f, tipo_doc: e.target.value as any, num_doc: "" }))} required>
                  {TIPO_DOCS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">N° Doc</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={form.num_doc} onChange={e => setForm(f => ({ ...f, num_doc: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Teléfono</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} required />
              </div>
              <div>
                <label className="block mb-1 font-medium">Categoría IVA</label>
                <select className="w-full border rounded px-2 py-1" value={form.categoria_iva} onChange={e => setForm(f => ({ ...f, categoria_iva: e.target.value as any }))} required>
                  {CATEGORIAS_IVA.map(c => <option key={c} value={c}>{c}</option>)}
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
              <th className="px-2 py-1 text-left">Razón Social</th>
              <th className="px-2 py-1 text-left">Tipo</th>
              <th className="px-2 py-1 text-left">Email</th>
              <th className="px-2 py-1 text-left">Tipo Doc</th>
              <th className="px-2 py-1 text-left">N° Doc</th>
              <th className="px-2 py-1 text-left">Teléfono</th>
              <th className="px-2 py-1 text-left">Categoría IVA</th>
              <th className="px-2 py-1 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-2 py-1 align-middle">{c.id}</td>
                <td className="px-2 py-1 align-middle">{c.razon_social}</td>
                <td className="px-2 py-1 align-middle">{c.tipo}</td>
                <td className="px-2 py-1 align-middle">{c.email}</td>
                <td className="px-2 py-1 align-middle">{c.tipo_doc}</td>
                <td className="px-2 py-1 align-middle">{c.num_doc}</td>
                <td className="px-2 py-1 align-middle">{c.telefono}</td>
                <td className="px-2 py-1 align-middle">{c.categoria_iva}</td>
                <td className="px-2 py-1 text-center align-middle">
                  <button
                    className="text-blue-600 hover:text-blue-800 p-1"
                    onClick={() => openEdit(c)}
                    disabled={loading}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 p-1 ml-2"
                    onClick={() => handleDelete(c.id)}
                    disabled={loading}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr><td colSpan={9} className="text-center py-4 text-muted-foreground">No hay clientes registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 