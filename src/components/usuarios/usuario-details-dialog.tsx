"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteUsuario } from "@/services/usuarios";
import { Usuario } from "@/types/usuario";
import { toast } from "sonner";

interface UsuarioDetailsDialogProps {
  usuario: Usuario;
  onUsuarioDeleted: () => void;
}

export function UsuarioDetailsDialog({ usuario, onUsuarioDeleted }: UsuarioDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteUsuario(usuario.id);
      toast.success(`Usuario ${usuario.nombre} eliminado exitosamente`);
      setOpen(false);
      onUsuarioDeleted();
    } catch (error: unknown) {
      console.error("Error eliminando usuario:", {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = "Error eliminando usuario";
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-orange-100 text-orange-800';
      case 'vendedor': return 'bg-blue-100 text-blue-800';
      case 'cobrador': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detalles del Usuario</DialogTitle>
          <DialogDescription>
            Información completa del usuario del sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">ID</label>
              <p className="text-sm text-gray-900">{usuario.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Rol</label>
              <Badge className={getRolColor(usuario.rol)}>
                {usuario.rol}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Nombre</label>
            <p className="text-sm text-gray-900">{usuario.nombre}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-sm text-gray-900">{usuario.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Teléfono</label>
            <p className="text-sm text-gray-900">{usuario.telefono || 'No especificado'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Creado el</label>
              <p className="text-sm text-gray-900">{formatDate(usuario.creado_el)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Prueba gratuita</label>
              <p className="text-sm text-gray-900">
                {usuario.prueba_gratis ? 'Sí' : 'No'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Usuario
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">¿Confirmar eliminación?</span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sí, Eliminar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
          
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
