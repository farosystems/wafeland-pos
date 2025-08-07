"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Shield, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getModulos, createModulo, updateModulo, deleteModulo } from "@/services/permisos";
import { Modulo } from "@/types/permisos";
import { toast } from "sonner";

interface ModuloFormData {
  nombre: string;
  descripcion: string;
  icono: string;
  ruta: string;
  activo: boolean;
  orden: number;
}

export default function ModulosPage() {
  const { } = useUser();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);
  const [formData, setFormData] = useState<ModuloFormData>({
    nombre: "",
    descripcion: "",
    icono: "",
    ruta: "",
    activo: true,
    orden: 0
  });

  // Cargar datos iniciales
  useEffect(() => {
    const cargarModulos = async () => {
      try {
        setLoading(true);
        const modulosData = await getModulos();
        setModulos(modulosData);
      } catch (error) {
        console.error("Error cargando módulos:", error);
        toast.error("Error cargando módulos");
      } finally {
        setLoading(false);
      }
    };

    cargarModulos();
  }, []);

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      icono: "",
      ruta: "",
      activo: true,
      orden: 0
    });
    setEditingModulo(null);
    setShowModal(false);
  };

  // Abrir formulario para crear nuevo módulo
  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Abrir formulario para editar módulo
  const handleEdit = (modulo: Modulo) => {
    setEditingModulo(modulo);
    setFormData({
      nombre: modulo.nombre,
      descripcion: modulo.descripcion || "",
      icono: modulo.icono || "",
      ruta: modulo.ruta || "",
      activo: modulo.activo,
      orden: modulo.orden
    });
    setShowModal(true);
  };

  // Guardar módulo
  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre del módulo es obligatorio");
      return;
    }

    try {
      setSaving(true);
      
      if (editingModulo) {
        await updateModulo(editingModulo.id, formData);
        toast.success("Módulo actualizado correctamente");
      } else {
        await createModulo(formData);
        toast.success("Módulo creado correctamente");
      }
      
      resetForm();
      // Recargar módulos
      const modulosData = await getModulos();
      setModulos(modulosData);
    } catch (error: unknown) {
      console.error("Error guardando módulo:", error);
      
      let errorMessage = "Error guardando módulo";
      if (error && typeof error === 'object' && 'code' in error && error.code === "23505") {
        errorMessage = "Error: Ya existe un módulo con ese nombre";
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar módulo
  const handleDelete = async (modulo: Modulo) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el módulo "${modulo.nombre}"?`)) {
      return;
    }

    try {
      await deleteModulo(modulo.id);
      toast.success("Módulo eliminado correctamente");
      // Recargar módulos
      const modulosData = await getModulos();
      setModulos(modulosData);
    } catch (error: unknown) {
      console.error("Error eliminando módulo:", error);
      
      let errorMessage = "Error eliminando módulo";
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <BreadcrumbBar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando módulos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <BreadcrumbBar />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Módulos</h1>
            <p className="text-gray-600">Administra los módulos del sistema</p>
          </div>
        </div>
        
        <Button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Módulo
        </Button>
      </div>

      {/* Modal de formulario */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingModulo ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingModulo ? "Editar Módulo" : "Nuevo Módulo"}
            </DialogTitle>
            <DialogDescription>
              {editingModulo 
                ? "Modifica los datos del módulo seleccionado" 
                : "Completa los datos para crear un nuevo módulo"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-nombre">Nombre *</Label>
                <Input
                  id="modal-nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="dashboard"
                />
              </div>
              <div>
                <Label htmlFor="modal-descripcion">Descripción</Label>
                <Input
                  id="modal-descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Dashboard del sistema"
                />
              </div>
              <div>
                <Label htmlFor="modal-icono">Icono</Label>
                <Input
                  id="modal-icono"
                  value={formData.icono}
                  onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                  placeholder="BarChart3"
                />
              </div>
              <div>
                <Label htmlFor="modal-ruta">Ruta</Label>
                <Input
                  id="modal-ruta"
                  value={formData.ruta}
                  onChange={(e) => setFormData({ ...formData, ruta: e.target.value })}
                  placeholder="/dashboard"
                />
              </div>
              <div>
                <Label htmlFor="modal-orden">Orden</Label>
                <Input
                  id="modal-orden"
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                  placeholder="1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="modal-activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked as boolean })}
                />
                <Label htmlFor="modal-activo">Activo</Label>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                onClick={resetForm}
                variant="outline"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabla de módulos */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos del Sistema</CardTitle>
          <CardDescription>
            Lista de todos los módulos disponibles en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Módulo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruta
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orden
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modulos.map((modulo) => (
                  <tr key={modulo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{modulo.descripcion}</div>
                        <div className="text-sm text-gray-500">{modulo.nombre}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {modulo.ruta || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      {modulo.orden}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        modulo.activo 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {modulo.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={() => handleEdit(modulo)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(modulo)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 