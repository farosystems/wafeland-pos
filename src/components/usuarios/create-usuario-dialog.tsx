"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2 } from "lucide-react";
import { createUsuario, verificarEmailExistente } from "@/services/usuarios";
import { crearPermisosPorDefecto } from "@/services/permisos";
import { CreateUsuarioData } from "@/types/usuario";
import { toast } from "sonner";

interface CreateUsuarioDialogProps {
  onUsuarioCreated: () => void;
}

export function CreateUsuarioDialog({ onUsuarioCreated }: CreateUsuarioDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateUsuarioData>>({
    nombre: "",
    email: "",
    telefono: "",
    rol: "cobrador",
    prueba_gratis: true
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.nombre?.trim()) {
      newErrors.nombre = "El nombre es requerido";
    }

    if (!formData.email?.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    if (!formData.rol) {
      newErrors.rol = "El rol es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Verificar si el email ya existe
      const emailExiste = await verificarEmailExistente(formData.email!);
      if (emailExiste) {
        setErrors({ email: "Este email ya está registrado" });
        return;
      }

      // Crear el usuario
      const nuevoUsuario = await createUsuario(formData as CreateUsuarioData);

      // Crear permisos por defecto para el nuevo usuario
      await crearPermisosPorDefecto(nuevoUsuario.id, nuevoUsuario.rol);

      toast.success(`Usuario ${nuevoUsuario.nombre} creado exitosamente`);
      
      // Limpiar formulario y cerrar diálogo
      setFormData({
        nombre: "",
        email: "",
        telefono: "",
        rol: "cobrador",
        prueba_gratis: true
      });
      setErrors({});
      setOpen(false);
      
      // Notificar al componente padre
      onUsuarioCreated();
    } catch (error: unknown) {
      console.error("Error creando usuario:", {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = "Error creando usuario";
      if (error && typeof error === 'object' && 'code' in error && error.code === "23505") {
        errorMessage = "Error: Ya existe un usuario con este email.";
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Limpiar formulario al cerrar
      setFormData({
        nombre: "",
        email: "",
        telefono: "",
        rol: "cobrador",
        prueba_gratis: true
      });
      setErrors({});
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
             <DialogTrigger asChild>
         <Button className="bg-black hover:bg-gray-800">
           <UserPlus className="w-4 h-4 mr-2" />
           Crear Usuario
         </Button>
       </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa la información para crear un nuevo usuario del sistema.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre || ""}
              onChange={(e) => handleInputChange("nombre", e.target.value)}
              placeholder="Nombre completo"
              className={errors.nombre ? "border-red-500" : ""}
            />
            {errors.nombre && (
              <p className="text-sm text-red-500">{errors.nombre}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="usuario@ejemplo.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={formData.telefono || ""}
              onChange={(e) => handleInputChange("telefono", e.target.value)}
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rol">Rol *</Label>
            <Select
              value={formData.rol || "cobrador"}
              onValueChange={(value) => handleInputChange("rol", value)}
            >
              <SelectTrigger className={errors.rol ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="cobrador">Cobrador</SelectItem>
              </SelectContent>
            </Select>
            {errors.rol && (
              <p className="text-sm text-red-500">{errors.rol}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="prueba_gratis"
              checked={formData.prueba_gratis || false}
              onCheckedChange={(checked) => handleInputChange("prueba_gratis", checked as boolean)}
            />
            <Label htmlFor="prueba_gratis">Usuario de prueba gratuita</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
