"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Shield, Users, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { getUsuarios } from "@/services/usuarios";
import { getModulos, getAllPermisosConDetalles, updatePermisosUsuarioLote, crearPermisosPorDefecto, diagnosticarPermisos } from "@/services/permisos";
import { Usuario } from "@/types/usuario";
import { Modulo, PermisoUsuarioConDetalles } from "@/types/permisos";
import { toast } from "sonner";
import { CreateUsuarioDialog } from "@/components/usuarios/create-usuario-dialog";
import { UsuarioDetailsDialog } from "@/components/usuarios/usuario-details-dialog";

interface PermisosUsuario {
  [moduloId: number]: {
    puede_ver: boolean;
  };
}

export default function SeguridadPage() {
  const { user } = useUser();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [permisos, setPermisos] = useState<PermisoUsuarioConDetalles[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [permisosUsuario, setPermisosUsuario] = useState<PermisosUsuario>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRol, setFilterRol] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [creatingPermissions, setCreatingPermissions] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);

  // Función para obtener el usuario actual
  const obtenerUsuarioActual = async () => {
    if (user?.emailAddresses?.[0]?.emailAddress) {
      try {
        const usuariosData = await getUsuarios();
        const usuario = usuariosData.find(u => 
          u.email.toLowerCase() === user.emailAddresses[0].emailAddress.toLowerCase()
        );
        setUsuarioActual(usuario || null);
      } catch (error) {
        console.error("Error obteniendo usuario actual:", error);
      }
    }
  };

  // Función para recargar datos
  const recargarDatos = async () => {
    try {
      setLoading(true);
      const [usuariosData, modulosData, permisosData] = await Promise.all([
        getUsuarios(),
        getModulos(),
        getAllPermisosConDetalles()
      ]);

      setUsuarios(usuariosData);
      setModulos(modulosData);
      setPermisos(permisosData);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    recargarDatos();
    obtenerUsuarioActual();
  }, [user]);

  // Filtrar usuarios
  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = !filterRol || usuario.rol === filterRol;
    return matchesSearch && matchesRol;
  });

  // Seleccionar usuario y cargar sus permisos
  const handleSelectUsuario = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setHasChanges(false);

    // Obtener permisos del usuario seleccionado
    const permisosDelUsuario = permisos.filter(p => p.fk_id_usuario === usuario.id);
    const permisosMap: PermisosUsuario = {};

    modulos.forEach(modulo => {
      const permiso = permisosDelUsuario.find(p => p.fk_id_modulo === modulo.id);
      permisosMap[modulo.id] = {
        puede_ver: permiso?.puede_ver || false
      };
    });

    setPermisosUsuario(permisosMap);
  };

  // Actualizar permiso
  const handlePermisoChange = (moduloId: number, value: boolean) => {
    setPermisosUsuario(prev => ({
      ...prev,
      [moduloId]: {
        ...prev[moduloId],
        puede_ver: value
      }
    }));
    setHasChanges(true);
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!selectedUsuario) return;

    try {
      setSaving(true);
      
      // Preparar datos para actualización en lote
      const permisosParaActualizar: { [moduloId: number]: { puede_ver: boolean } } = {};
      
      Object.entries(permisosUsuario).forEach(([moduloId, permiso]) => {
        const moduloIdNum = parseInt(moduloId);
        if (!isNaN(moduloIdNum) && permiso && typeof permiso.puede_ver === 'boolean') {
          permisosParaActualizar[moduloIdNum] = {
            puede_ver: permiso.puede_ver
          };
        }
      });

      // Validar que hay datos para actualizar
      if (Object.keys(permisosParaActualizar).length === 0) {
        toast.warning("No hay cambios para guardar");
        return;
      }

      await updatePermisosUsuarioLote(selectedUsuario.id, permisosParaActualizar);
      
      toast.success("Permisos actualizados correctamente");
      setHasChanges(false);
      
      // Recargar datos
      const permisosActualizados = await getAllPermisosConDetalles();
      setPermisos(permisosActualizados);
    } catch (error: unknown) {
      console.error("Error guardando permisos:", {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Mostrar mensaje de error más específico
      let errorMessage = "Error guardando permisos";
      if (error && typeof error === 'object' && 'code' in error && error.code === "23505") {
        errorMessage = "Error: Ya existe un permiso para este usuario y módulo. Intenta recargar la página.";
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Función de diagnóstico
  const handleDiagnostico = async () => {
    if (!selectedUsuario) {
      toast.warning("Selecciona un usuario primero");
      return;
    }

    try {
      const resultado = await diagnosticarPermisos(selectedUsuario.id);
      console.log("Diagnóstico de permisos:", resultado);
      
      if (resultado.error) {
        toast.error(`Error en diagnóstico: ${resultado.error}`);
      } else {
        toast.success(`Diagnóstico completado. Usuario: ${resultado.usuario.nombre}, Permisos: ${resultado.totalPermisos}, Módulos: ${resultado.totalModulos}`);
      }
    } catch (error) {
      console.error("Error en diagnóstico:", error);
      toast.error("Error ejecutando diagnóstico");
    }
  };

  // Crear permisos para usuarios existentes
  const handleCreatePermissionsForExistingUsers = async () => {
    try {
      setCreatingPermissions(true);
      
      // Obtener usuarios que no tienen permisos
      const usuariosSinPermisos = usuarios.filter(usuario => {
        const permisosDelUsuario = permisos.filter(p => p.fk_id_usuario === usuario.id);
        return permisosDelUsuario.length === 0;
      });

      if (usuariosSinPermisos.length === 0) {
        toast.info("Todos los usuarios ya tienen permisos asignados");
        return;
      }

      // Crear permisos para cada usuario sin permisos
      for (const usuario of usuariosSinPermisos) {
        await crearPermisosPorDefecto(usuario.id, usuario.rol);
      }

      toast.success(`Permisos creados para ${usuariosSinPermisos.length} usuarios`);
      
      // Recargar datos
      const permisosActualizados = await getAllPermisosConDetalles();
      setPermisos(permisosActualizados);
    } catch (error: unknown) {
      console.error("Error creando permisos:", {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Mostrar mensaje de error más específico
      let errorMessage = "Error creando permisos para usuarios existentes";
      if (error && typeof error === 'object' && 'code' in error && error.code === "23505") {
        errorMessage = "Error: Algunos permisos ya existen. Los permisos duplicados fueron ignorados.";
      } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        errorMessage = `Error: ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setCreatingPermissions(false);
    }
  };

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

  // Obtener icono del módulo
  const getModuloIcon = (icono: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'BarChart3': <div className="w-4 h-4 bg-blue-500 rounded" />,
      'Package': <div className="w-4 h-4 bg-green-500 rounded" />,
      'Users': <div className="w-4 h-4 bg-purple-500 rounded" />,
      'ShoppingCart': <div className="w-4 h-4 bg-orange-500 rounded" />,
      'FileText': <div className="w-4 h-4 bg-indigo-500 rounded" />,
      'CreditCard': <div className="w-4 h-4 bg-yellow-500 rounded" />,
      'Receipt': <div className="w-4 h-4 bg-pink-500 rounded" />,
      'Truck': <div className="w-4 h-4 bg-teal-500 rounded" />,
      'Upload': <div className="w-4 h-4 bg-cyan-500 rounded" />,
      'AlertTriangle': <div className="w-4 h-4 bg-red-500 rounded" />,
      'CashRegister': <div className="w-4 h-4 bg-emerald-500 rounded" />,
      'UserCheck': <div className="w-4 h-4 bg-violet-500 rounded" />,
      'DollarSign': <div className="w-4 h-4 bg-lime-500 rounded" />,
      'Calculator': <div className="w-4 h-4 bg-amber-500 rounded" />,
      'Palette': <div className="w-4 h-4 bg-rose-500 rounded" />,
      'Layers': <div className="w-4 h-4 bg-sky-500 rounded" />,
      'Folder': <div className="w-4 h-4 bg-stone-500 rounded" />
    };
    
    return iconMap[icono] || <div className="w-4 h-4 bg-gray-500 rounded" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <BreadcrumbBar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos...</p>
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
             <h1 className="text-2xl font-bold text-gray-900">Seguridad por Usuario</h1>
             <p className="text-gray-600">Gestiona los permisos de visualización de módulos para cada usuario</p>
           </div>
         </div>
         
         <div className="flex items-center gap-2">
           {/* Mostrar botón para administradores */}
           {(usuarioActual?.rol === 'admin' || user?.emailAddresses?.[0]?.emailAddress === 'admindemokiosco@gmail.com') && (
             <CreateUsuarioDialog onUsuarioCreated={recargarDatos} />
           )}
           

           
           <Button
             onClick={handleCreatePermissionsForExistingUsers}
             disabled={creatingPermissions}
             variant="outline"
             className="border-green-600 text-green-600 hover:bg-green-50"
           >
             {creatingPermissions ? (
               <>
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                 Creando...
               </>
             ) : (
               <>
                 <Users className="w-4 h-4 mr-2" />
                 Crear Permisos para Usuarios Existentes
               </>
             )}
           </Button>
           
           {selectedUsuario && hasChanges && (
             <div className="flex items-center gap-2">
               <div className="flex items-center gap-2 text-orange-600">
                 <AlertTriangle className="w-4 h-4" />
                 <span className="text-sm font-medium">Cambios pendientes</span>
               </div>
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
                     Guardar Cambios
                   </>
                 )}
               </Button>
             </div>
           )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Usuarios */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuarios del Sistema
            </CardTitle>
            <CardDescription>
              Selecciona un usuario para gestionar sus permisos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="search">Buscar usuario</Label>
                <Input
                  id="search"
                  placeholder="Nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="rol-filter">Filtrar por rol</Label>
                <select
                  id="rol-filter"
                  value={filterRol}
                  onChange={(e) => setFilterRol(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los roles</option>
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="cobrador">Cobrador</option>
                </select>
              </div>
            </div>

            <Separator />

            {/* Lista de usuarios */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsuarios.map((usuario) => (
                <div
                  key={usuario.id}
                  onClick={() => handleSelectUsuario(usuario)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUsuario?.id === usuario.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                                     <div className="flex items-center justify-between">
                     <div className="flex-1">
                       <div className="font-medium text-gray-900">{usuario.nombre}</div>
                       <div className="text-sm text-gray-600">{usuario.email}</div>
                     </div>
                     <div className="flex items-center gap-2">
                       <Badge className={getRolColor(usuario.rol)}>
                         {usuario.rol}
                       </Badge>
                       <UsuarioDetailsDialog 
                         usuario={usuario} 
                         onUsuarioDeleted={recargarDatos} 
                       />
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Panel de Permisos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permisos de Visualización
            </CardTitle>
            <CardDescription>
              {selectedUsuario 
                ? `Gestionando permisos para ${selectedUsuario.nombre}`
                : "Selecciona un usuario para ver sus permisos"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUsuario ? (
              <div className="space-y-4">
                {/* Información del usuario seleccionado */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedUsuario.nombre}</h3>
                      <p className="text-sm text-gray-600">{selectedUsuario.email}</p>
                    </div>
                    <Badge className={getRolColor(selectedUsuario.rol)}>
                      {selectedUsuario.rol}
                    </Badge>
                  </div>
                </div>

                {/* Tabla de permisos */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Módulo
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Puede Ver
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {modulos.map((modulo) => (
                        <tr key={modulo.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {getModuloIcon(modulo.icono)}
                              <div>
                                <div className="font-medium text-gray-900">{modulo.descripcion}</div>
                                <div className="text-sm text-gray-500">{modulo.nombre}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Checkbox
                              checked={permisosUsuario[modulo.id]?.puede_ver || false}
                              onCheckedChange={(checked) => 
                                handlePermisoChange(modulo.id, checked as boolean)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Resumen */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Módulos habilitados: {
                          Object.values(permisosUsuario).filter(p => p.puede_ver).length
                        } de {modulos.length}
                      </p>
                      <p className="text-xs text-blue-700">
                        Los cambios se aplicarán inmediatamente al guardar
                      </p>
                      <Button
                        onClick={handleDiagnostico}
                        variant="outline"
                        size="sm"
                        className="mt-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                      >
                        🔍 Diagnóstico
                      </Button>
                    </div>
                    {hasChanges && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Cambios pendientes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecciona un usuario
                </h3>
                <p className="text-gray-600">
                  Elige un usuario de la lista para gestionar sus permisos de visualización
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 