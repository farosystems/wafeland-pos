"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getClientes, createCliente, updateCliente, deleteCliente } from "@/services/clientes";
import { Cliente, CreateClienteData } from "@/types/cliente";
import { Users, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTrialCheck } from "@/hooks/use-trial-check";

export function ClientesContent() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [filtro, setFiltro] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const CLIENTES_POR_PAGINA = 10;
  const { checkTrial } = useTrialCheck();
  const [showTrialEnded, setShowTrialEnded] = useState(false);

  // Memoizar clientes filtrados
  const clientesFiltrados = useMemo(() => {
    if (!filtro.trim()) return clientes;
    
    const filtroLower = filtro.toLowerCase();
    return clientes.filter(cliente => {
      return (
        cliente.razon_social.toLowerCase().includes(filtroLower) ||
        cliente.email.toLowerCase().includes(filtroLower) ||
        cliente.num_doc.toLowerCase().includes(filtroLower) ||
        cliente.telefono.toLowerCase().includes(filtroLower) ||
        cliente.categoria_iva.toLowerCase().includes(filtroLower)
      );
    });
  }, [clientes, filtro]);

  // Memoizar clientes paginados
  const clientesPagina = useMemo(() => {
    const totalPaginas = Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA);
    const paginaValida = Math.min(paginaActual, totalPaginas);
    if (paginaValida !== paginaActual && totalPaginas > 0) {
      setPaginaActual(paginaValida);
    }
    return clientesFiltrados.slice((paginaValida - 1) * CLIENTES_POR_PAGINA, paginaValida * CLIENTES_POR_PAGINA);
  }, [clientesFiltrados, paginaActual]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA);
  }, [clientesFiltrados]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openNew = useCallback(() => {
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
  }, []);

  const openEdit = useCallback((cliente: Cliente) => {
    setEditing(cliente);
    setForm({ ...cliente });
    setFormError(null);
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditing(null);
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const expired = await checkTrial(() => setShowTrialEnded(true));
    if (expired) return;
    try {
      if (editing) {
        await updateCliente(editing.id, form);
      } else {
        await createCliente(form);
      }
      closeDialog();
      fetchAll(); // Refrescar datos
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      setFormError((error as Error).message);
    }
  }, [editing, form, closeDialog, fetchAll, checkTrial]);

  const handleDelete = useCallback(async (id: number) => {
    const expired = await checkTrial(() => setShowTrialEnded(true));
    if (expired) return;
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return;
    
    try {
      await deleteCliente(id);
      fetchAll(); // Refrescar datos
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      setError((error as Error).message);
    }
  }, [fetchAll, checkTrial]);

  if (loading) {
    return (
      <div className="w-full px-8 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Gestión de Clientes</h1>
            <p className="text-muted-foreground text-base">Administra tu base de datos de clientes y proveedores.</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando clientes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-8 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Gestión de Clientes</h1>
            <p className="text-muted-foreground text-base">Administra tu base de datos de clientes y proveedores.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchAll}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refrescar"}
          </Button>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="border rounded px-3 py-2 flex-1 max-w-xs"
          />
        </div>

        <table className="min-w-full text-sm border mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1">ID</th>
              <th className="px-2 py-1">Razón social</th>
              <th className="px-2 py-1">Email</th>
              <th className="px-2 py-1">Teléfono</th>
              <th className="px-2 py-1">Categoría IVA</th>
              <th className="px-2 py-1 text-center">Máximo cuenta corriente</th>
              <th className="px-2 py-1">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesPagina.map((cliente) => (
              <tr key={cliente.id} className="border-b hover:bg-blue-50 transition-colors">
                <td className="px-2 py-1">{cliente.id}</td>
                <td className="px-2 py-1">{cliente.razon_social}</td>
                <td className="px-2 py-1">{cliente.email}</td>
                <td className="px-2 py-1">{cliente.telefono}</td>
                <td className="px-2 py-1">{cliente.categoria_iva}</td>
                <td className="px-2 py-1 text-center">
                  {cliente.maximo_cuenta_corriente !== undefined && cliente.maximo_cuenta_corriente !== null
                    ? `$${cliente.maximo_cuenta_corriente.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '-'}
                </td>
                <td className="px-2 py-1">
                  {/* Acciones existentes */}
                  <Button size="sm" variant="outline" onClick={() => openEdit(cliente)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(cliente.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {clientesFiltrados.length === 0 ? (
              "0 de 0 clientes."
            ) : (
              `${(paginaActual - 1) * CLIENTES_POR_PAGINA + 1} - ${Math.min(paginaActual * CLIENTES_POR_PAGINA, clientesFiltrados.length)} de ${clientesFiltrados.length} cliente(s).`
            )}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent preventOutsideClose>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifica los datos del cliente." : "Completa los datos para crear un nuevo cliente."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Razón Social</label>
              <input
                type="text"
                value={form.razon_social}
                onChange={e => setForm({ ...form, razon_social: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value as "cliente" | "proveedor" })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-medium">Tipo de Documento</label>
                <select
                  value={form.tipo_doc}
                  onChange={e => setForm({ ...form, tipo_doc: e.target.value as "dni" | "cuit" | "cuil" })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="dni">DNI</option>
                  <option value="cuit">CUIT</option>
                  <option value="cuil">CUIL</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Número de Documento</label>
                <input
                  type="text"
                  value={form.num_doc}
                  onChange={e => setForm({ ...form, num_doc: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-medium">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Categoría IVA</label>
              <select
                value={form.categoria_iva}
                onChange={e => setForm({ ...form, categoria_iva: e.target.value as "Consumidor Final" | "Responsable Inscripto" | "Responsable Monotributo" | "Exento" | "No Responsable" | "Sujeto no Categorizado" })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Consumidor Final">Consumidor Final</option>
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Responsable Monotributo">Responsable Monotributo</option>
                <option value="Exento">Exento</option>
                <option value="No Responsable">No Responsable</option>
                <option value="Sujeto no Categorizado">Sujeto no Categorizado</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Máximo cuenta corriente</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.maximo_cuenta_corriente ?? ''}
                onChange={e => setForm(f => ({ ...f, maximo_cuenta_corriente: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                min={0}
                step={0.01}
                placeholder="Ej: 50000.00"
              />
            </div>
            {formError && <div className="text-red-600 text-sm">{formError}</div>}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar+
              </Button>
              <Button type="submit">
                {editing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrialEnded} onOpenChange={setShowTrialEnded}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prueba gratis finalizada</DialogTitle>
            <DialogDescription>
              La prueba gratis ha finalizado. Debe abonar para continuar usando el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowTrialEnded(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 