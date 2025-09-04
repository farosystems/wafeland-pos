"use client";

import * as React from "react";
import { IconTable, IconPlus, IconTrash, IconSettings } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableroMesas } from "@/components/mesas/tablero-mesas";
import { MesaForm } from "@/components/mesas/mesa-form";
import { MesaDetailModal } from "@/components/mesas/mesa-detail-modal";
import { useMesas } from "@/hooks/use-mesas";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Mesa, CreateMesaData, EstadoMesaTablero } from "@/types/mesa";
import { Badge } from "@/components/ui/badge";

export function MesasContent() {
  const { isSignedIn } = useUser();
  const {
    estadoTablero,
    error,
    loading,
    crearMesa,
    actualizarMesa,
    eliminarMesa,
    abrirSesionMesa,
    refetch,
  } = useMesas();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingMesa, setEditingMesa] = React.useState<Mesa | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showGestionMesas, setShowGestionMesas] = React.useState(false);
  
  // Estados para modal de abrir mesa
  const [isAbrirMesaOpen, setIsAbrirMesaOpen] = React.useState(false);
  const [mesaParaAbrir, setMesaParaAbrir] = React.useState<Mesa | undefined>();
  const [comensales, setComensales] = React.useState(1);

  // Estados para modal de detalle de mesa
  const [isMesaDetailOpen, setIsMesaDetailOpen] = React.useState(false);
  const [mesaSeleccionada, setMesaSeleccionada] = React.useState<EstadoMesaTablero | null>(null);

  // Estados para el contador de mesas
  const mesasLibres = estadoTablero.filter(m => m.estado === 'libre').length;
  const mesasOcupadas = estadoTablero.filter(m => m.estado === 'ocupada').length;
  const mesasPorCobrar = estadoTablero.filter(m => m.estado === 'por_cobrar').length;

  const openCreateDialog = () => {
    setEditingMesa(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (mesa: Mesa) => {
    setEditingMesa(mesa);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMesa(undefined);
  };

  const handleSave = async (data: CreateMesaData) => {
    setIsLoading(true);
    try {
      if (editingMesa) {
        await actualizarMesa(editingMesa.id, data);
        toast.success("Mesa actualizada correctamente");
      } else {
        await crearMesa(data);
        toast.success("Mesa creada correctamente");
      }
      closeDialog();
    } catch (error) {
      console.error("Error al guardar mesa:", error);
      const msg = (error as Error).message || "Error al guardar mesa";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (mesa: Mesa) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la mesa ${mesa.numero}?`)) {
      return;
    }

    try {
      await eliminarMesa(mesa.id);
      toast.success("Mesa eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar mesa:", error);
      const msg = (error as Error).message || "Error al eliminar mesa";
      toast.error(msg);
    }
  };

  const handleMesaMove = async (mesaId: number, nuevaPosicion: { x: number; y: number }) => {
    try {
      await actualizarMesa(mesaId, {
        posicion_x: nuevaPosicion.x,
        posicion_y: nuevaPosicion.y,
      });
    } catch (error) {
      console.error("Error al mover mesa:", error);
      toast.error("Error al actualizar posición de mesa");
    }
  };

  const handleMesaClick = (estadoMesa: EstadoMesaTablero) => {
    if (estadoMesa.estado === 'libre') {
      // Abrir modal para configurar comensales
      setMesaParaAbrir(estadoMesa.mesa);
      setComensales(1);
      setIsAbrirMesaOpen(true);
    } else {
      // Abrir modal de gestión de mesa ocupada
      setMesaSeleccionada(estadoMesa);
      setIsMesaDetailOpen(true);
    }
  };

  const handleAbrirMesa = async () => {
    if (!mesaParaAbrir || comensales < 1) return;

    setIsLoading(true);
    try {
      // Obtener usuario y lote activo sería manejado por la acción del servidor
      await abrirSesionMesa({
        fk_id_mesa: mesaParaAbrir.id,
        fk_id_usuario: 0, // Se asigna automáticamente en el servidor
        fk_id_lote: 0, // Se asigna automáticamente en el servidor
        comensales,
      });
      
      toast.success(`Mesa ${mesaParaAbrir.numero} abierta con ${comensales} comensales`);
      setIsAbrirMesaOpen(false);
      setMesaParaAbrir(undefined);
      setComensales(1);
    } catch (error) {
      console.error("Error al abrir mesa:", error);
      const msg = (error as Error).message || "Error al abrir mesa";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar error si existe
  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-lg text-muted-foreground">Debes iniciar sesión para gestionar las mesas.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-8 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconTable className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Gestión de Mesas</h1>
            <p className="text-muted-foreground text-base">Administra las mesas de tu local y el estado de cada una.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowGestionMesas(!showGestionMesas)}
            variant="outline"
            className="gap-2"
          >
            <IconSettings className="h-4 w-4" />
            {showGestionMesas ? 'Ocultar Gestión' : 'Gestionar Mesas'}
          </Button>
          <Button onClick={refetch} variant="outline">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {mesasLibres}
            </Badge>
            <span className="text-sm font-medium">Mesas Libres</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {mesasOcupadas}
            </Badge>
            <span className="text-sm font-medium">Mesas Ocupadas</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {mesasPorCobrar}
            </Badge>
            <span className="text-sm font-medium">Por Cobrar</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
              {estadoTablero.length}
            </Badge>
            <span className="text-sm font-medium">Total Mesas</span>
          </div>
        </div>
      </div>

      {/* Panel de gestión de mesas (oculto por defecto) */}
      {showGestionMesas && (
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Gestión de Mesas</h2>
              <Button onClick={openCreateDialog} className="gap-2">
                <IconPlus className="h-4 w-4" />
                Nueva Mesa
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {estadoTablero.map((estadoMesa) => (
                <div 
                  key={estadoMesa.mesa.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Mesa {estadoMesa.mesa.numero}</h3>
                    <Badge 
                      variant={estadoMesa.estado === 'libre' ? 'secondary' : 
                              estadoMesa.estado === 'ocupada' ? 'default' : 'destructive'}
                      className={
                        estadoMesa.estado === 'libre' ? 'bg-green-100 text-green-800' :
                        estadoMesa.estado === 'ocupada' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }
                    >
                      {estadoMesa.estado === 'libre' ? 'Libre' :
                       estadoMesa.estado === 'ocupada' ? 'Ocupada' : 'Por Cobrar'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Capacidad: {estadoMesa.mesa.capacidad} personas
                  </p>
                  {estadoMesa.mesa.descripcion && (
                    <p className="text-xs text-gray-500 mb-3">{estadoMesa.mesa.descripcion}</p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(estadoMesa.mesa)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(estadoMesa.mesa)}
                      disabled={estadoMesa.estado !== 'libre'}
                    >
                      <IconTrash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tablero principal de mesas */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Tablero de Mesas</h2>
          <div className="h-[600px] bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg relative overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">Cargando mesas...</p>
              </div>
            ) : (
              <TableroMesas
                estadoMesas={estadoTablero}
                onMesaMove={handleMesaMove}
                onMesaClick={handleMesaClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialog para crear/editar mesa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMesa ? "Editar Mesa" : "Nueva Mesa"}
            </DialogTitle>
            <DialogDescription>
              {editingMesa 
                ? "Modifica los datos de la mesa seleccionada." 
                : "Completa los datos para crear una nueva mesa."
              }
            </DialogDescription>
          </DialogHeader>
          <MesaForm
            mesa={editingMesa}
            onSave={handleSave}
            onCancel={closeDialog}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Modal para abrir mesa */}
      <Dialog open={isAbrirMesaOpen} onOpenChange={setIsAbrirMesaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Abrir Mesa {mesaParaAbrir?.numero}</DialogTitle>
            <DialogDescription>
              Selecciona el número de comensales para comenzar el servicio.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comensales">Número de comensales *</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComensales(Math.max(1, comensales - 1))}
                  disabled={comensales <= 1}
                >
                  -
                </Button>
                <Input
                  id="comensales"
                  type="number"
                  min={1}
                  max={mesaParaAbrir?.capacidad || 10}
                  value={comensales}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const max = mesaParaAbrir?.capacidad || 10;
                    setComensales(Math.min(Math.max(1, value), max));
                  }}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComensales(Math.min(mesaParaAbrir?.capacidad || 10, comensales + 1))}
                  disabled={comensales >= (mesaParaAbrir?.capacidad || 10)}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Capacidad máxima: {mesaParaAbrir?.capacidad} personas
              </p>
            </div>
            
            {mesaParaAbrir?.descripcion && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">{mesaParaAbrir.descripcion}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAbrirMesaOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAbrirMesa}
              disabled={isLoading || comensales < 1}
            >
              {isLoading ? "Abriendo..." : "Abrir Mesa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de detalle de mesa */}
      <MesaDetailModal
        estadoMesa={mesaSeleccionada}
        isOpen={isMesaDetailOpen}
        onClose={() => {
          setIsMesaDetailOpen(false);
          setMesaSeleccionada(null);
        }}
        onMesaCerrada={() => {
          refetch(); // Recargar el estado del tablero
        }}
      />
    </div>
  );
}