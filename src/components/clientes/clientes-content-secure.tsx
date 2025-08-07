"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { getClientes, createCliente, updateCliente, deleteCliente } from "@/app/actions/clientes";
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
import { toast } from "sonner";

export function ClientesContentSecure() {
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
  const [, setShowTrialEnded] = useState(false);

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
      toast.error((error as Error).message);
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
    setForm({
      razon_social: cliente.razon_social,
      tipo: cliente.tipo,
      email: cliente.email,
      tipo_doc: cliente.tipo_doc,
      num_doc: cliente.num_doc,
      telefono: cliente.telefono,
      categoria_iva: cliente.categoria_iva,
    });
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
    
    // Validar prueba gratis
    const expired = await checkTrial(() => setShowTrialEnded(true));
    if (expired) return;

    // Validaciones básicas
    if (!form.razon_social.trim()) {
      setFormError("La razón social es requerida");
      return;
    }

    if (!form.email.trim()) {
      setFormError("El email es requerido");
      return;
    }

    if (!form.num_doc.trim()) {
      setFormError("El número de documento es requerido");
      return;
    }

    setFormError(null);
    setLoading(true);

    try {
      if (editing) {
        await updateCliente(editing.id, form);
        toast.success("Cliente actualizado correctamente");
      } else {
        await createCliente(form);
        toast.success("Cliente creado correctamente");
      }
      
      closeDialog();
      fetchAll();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      setFormError((error as Error).message);
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [form, editing, checkTrial, closeDialog, fetchAll]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      return;
    }

    setLoading(true);
    try {
      await deleteCliente(id);
      toast.success("Cliente eliminado correctamente");
      fetchAll();
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  // Mostrar error si existe
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (loading && clientes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando clientes y proveedores...</span>
      </div>
    );
  }

  return (
    <div className="w-full px-8 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Clientes y Proveedores</h1>
            <p className="text-muted-foreground text-base">Administra tu base de datos de clientes.</p>
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

      {/* Filtro */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar clientes o proveedores..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Cliente
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Tipo
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Email
                 </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Categoría IVA
                 </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Acciones
                 </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientesPagina.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                                     <td className="px-6 py-4 whitespace-nowrap">
                     <div className="text-sm font-medium text-gray-900">
                       {cliente.razon_social}
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                       cliente.tipo === 'cliente' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                     }`}>
                       {cliente.tipo === 'cliente' ? 'Cliente' : 'Proveedor'}
                     </span>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {cliente.email}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cliente.tipo_doc}: {cliente.num_doc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cliente.telefono}
                  </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {cliente.categoria_iva}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(cliente)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cliente.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((paginaActual - 1) * CLIENTES_POR_PAGINA) + 1} a{" "}
                {Math.min(paginaActual * CLIENTES_POR_PAGINA, clientesFiltrados.length)} de{" "}
                {clientesFiltrados.length} clientes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(paginaActual - 1)}
                  disabled={paginaActual === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-700">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialog para crear/editar cliente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editing 
                ? "Modifica los datos del cliente seleccionado." 
                : "Completa los datos para crear un nuevo cliente."
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social *
                </label>
                <input
                  type="text"
                  value={form.razon_social}
                  onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as "cliente" | "proveedor" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cliente">Cliente</option>
                  <option value="proveedor">Proveedor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={form.tipo_doc}
                  onChange={(e) => setForm({ ...form, tipo_doc: e.target.value as "dni" | "cuit" | "cuil" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dni">DNI</option>
                  <option value="cuit">CUIT</option>
                  <option value="cuil">CUIL</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  value={form.num_doc}
                  onChange={(e) => setForm({ ...form, num_doc: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría IVA
                </label>
                <select
                  value={form.categoria_iva}
                  onChange={(e) => setForm({ ...form, categoria_iva: e.target.value as "Consumidor Final" | "Responsable Inscripto" | "Responsable Monotributo" | "Exento" | "No Responsable" | "Sujeto no Categorizado" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Consumidor Final">Consumidor Final</option>
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Exento">Exento</option>
                </select>
              </div>
            </div>
            
            
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 