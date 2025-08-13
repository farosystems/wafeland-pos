"use client";
import * as React from "react";
import { useState, useEffect } from "react";
import { getUsuarios } from "@/services/usuarios";
import { Usuario } from "@/types/usuario";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { CreateUsuarioDialog } from "@/components/usuarios/create-usuario-dialog";
import { UsuarioDetailsDialog } from "@/components/usuarios/usuario-details-dialog";
import { toast } from "sonner";

export function UsuariosContent() {
  const { user } = useUser();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);

  const fetchAllAndCurrent = React.useCallback(async () => {
    setLoading(true); 
    setError(null);
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
      toast.error("Error cargando usuarios");
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

  // Determinar qué usuarios mostrar según el rol
  const usuariosAMostrar = usuarioActual?.rol === "admin" || usuarioActual?.rol === "supervisor"
    ? usuarios
    : usuarioActual
      ? usuarios.filter(u => normalizeEmail(u.email) === normalizeEmail(usuarioActual.email))
      : [];

  // Solo permitir alta/edición si es admin o supervisor
  const puedeEditar = usuarioActual?.rol === "admin" || usuarioActual?.rol === "supervisor";

  // Obtener color del badge según el rol
  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-orange-100 text-orange-800';
      case 'vendedor': return 'bg-blue-100 text-blue-800';
      case 'cobrador': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando usuarios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-gray-600">Gestiona los usuarios del sistema</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Debug: Mostrar información del usuario actual */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500">
              Usuario actual: {usuarioActual?.nombre} (Rol: {usuarioActual?.rol})
            </div>
          )}
          
          {/* Mostrar botón para administradores y supervisores */}
          {puedeEditar && (
            <CreateUsuarioDialog onUsuarioCreated={fetchAllAndCurrent} />
          )}
        </div>
      </div>



      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {usuariosAMostrar.length} usuario(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado el
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosAMostrar.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {usuario.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{usuario.nombre}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{usuario.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{usuario.telefono || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={getRolColor(usuario.rol)}>
                        {usuario.rol}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(usuario.creado_el).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <UsuarioDetailsDialog 
                          usuario={usuario} 
                          onUsuarioDeleted={fetchAllAndCurrent} 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
                     {usuariosAMostrar.length === 0 && (
             <div className="text-center py-12">
               <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
               <h3 className="text-lg font-medium text-gray-900 mb-2">
                 No se encontraron usuarios
               </h3>
               <p className="text-gray-600">
                 No hay usuarios registrados en el sistema
               </p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
} 