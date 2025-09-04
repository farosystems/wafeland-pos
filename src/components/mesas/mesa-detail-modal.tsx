"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductosTable } from "./productos-table";
import { PedidoDetail } from "./pedido-detail";
import { CobroModal } from "./cobro-modal";
import { EstadoMesaTablero } from "@/types/mesa";
import { Article } from "@/types/article";
import { useMesaDetail } from "@/hooks/use-mesa-detail";
import { toast } from "sonner";

interface MesaDetailModalProps {
  estadoMesa: EstadoMesaTablero | null;
  isOpen: boolean;
  onClose: () => void;
  onMesaCerrada: () => void;
}

export function MesaDetailModal({ 
  estadoMesa, 
  isOpen, 
  onClose, 
  onMesaCerrada 
}: MesaDetailModalProps) {
  const {
    pedidos,
    detallePedidos,
    productos,
    loading,
    error,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    cerrarMesa,
    refetchPedidos,
  } = useMesaDetail(estadoMesa?.sesion_activa?.sesion_id);

  // Estados para el modal de cobro
  const [isCobroModalOpen, setIsCobroModalOpen] = React.useState(false);

  // Reset estados cuando se abre/cierra el modal
  React.useEffect(() => {
    if (isOpen && estadoMesa?.sesion_activa) {
      refetchPedidos();
    }
  }, [isOpen, estadoMesa, refetchPedidos]);

  const handleAgregarProducto = async (producto: Article, cantidad: number) => {
    try {
      await agregarProducto(producto, cantidad);
      toast.success(`${producto.descripcion} agregado al pedido`);
    } catch (error) {
      console.error("Error al agregar producto:", error);
      toast.error("Error al agregar producto");
    }
  };

  const handleActualizarCantidad = async (detalleId: number, nuevaCantidad: number) => {
    try {
      await actualizarCantidad(detalleId, nuevaCantidad);
    } catch (error) {
      console.error("Error al actualizar cantidad:", error);
      toast.error("Error al actualizar cantidad");
    }
  };

  const handleEliminarProducto = async (detalleId: number) => {
    try {
      await eliminarProducto(detalleId);
      toast.success("Producto eliminado del pedido");
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      toast.error("Error al eliminar producto");
    }
  };

  const handleCerrarMesa = async () => {
    if (!estadoMesa?.sesion_activa) return;

    try {
      await cerrarMesa();
      toast.success(`Mesa ${estadoMesa.mesa.numero} marcada para cobro`);
      onMesaCerrada(); // Refrescar el estado del tablero
      onClose(); // Cerrar el modal para que al volver a abrirlo se vea el nuevo estado
    } catch (error) {
      console.error("Error al cerrar mesa:", error);
      toast.error("Error al cerrar mesa");
    }
  };

  const handleCobrar = () => {
    setIsCobroModalOpen(true);
  };

  const handleCobroCompletado = () => {
    setIsCobroModalOpen(false);
    onMesaCerrada();
    onClose();
    toast.success("Cobro procesado exitosamente");
  };

  // Calcular totales
  const totalMesa = detallePedidos.reduce((sum, item) => sum + item.subtotal, 0);
  const totalProductos = detallePedidos.reduce((sum, item) => sum + item.cantidad, 0);

  if (!estadoMesa || !estadoMesa.sesion_activa) {
    return null;
  }

  const sesion = estadoMesa.sesion_activa;
  const esPorCobrar = estadoMesa.estado === 'por_cobrar';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">
                  Mesa {estadoMesa.mesa.numero}
                </span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>•</span>
                  <span>{sesion.comensales} comensales</span>
                  <span>•</span>
                  <span>{sesion.usuario_nombre}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  Total: ${totalMesa.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalProductos} productos
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              {estadoMesa.mesa.descripcion && (
                <span>{estadoMesa.mesa.descripcion} • </span>
              )}
              Gestiona los pedidos y productos de esta mesa
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-6 h-[calc(95vh-140px)]">
            {/* Panel izquierdo - Productos disponibles (solo si no está por cobrar) */}
            {!esPorCobrar && (
              <div className="flex-1 flex flex-col min-w-0">
                <div className="bg-white rounded-lg border flex-1 flex flex-col min-h-0">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold">Productos Disponibles</h3>
                    <p className="text-sm text-muted-foreground">
                      Busca y agrega productos al pedido de la mesa
                    </p>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ProductosTable
                      productos={productos}
                      loading={loading}
                      onAgregarProducto={handleAgregarProducto}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Panel derecho - Detalle del pedido */}
            <div className={esPorCobrar ? "flex-1 flex flex-col min-h-0" : "w-96 flex flex-col min-h-0"}>
              <PedidoDetail
                mesa={estadoMesa.mesa}
                sesion={sesion}
                pedidos={pedidos}
                detallePedidos={detallePedidos}
                totalMesa={totalMesa}
                mesaCerrada={false}
                loading={loading}
                onActualizarCantidad={handleActualizarCantidad}
                onEliminarProducto={handleEliminarProducto}
                onCerrarMesa={handleCerrarMesa}
                onCobrar={handleCobrar}
                esPorCobrar={esPorCobrar}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de cobro */}
      <CobroModal
        isOpen={isCobroModalOpen}
        onClose={() => setIsCobroModalOpen(false)}
        mesa={estadoMesa.mesa}
        sesion={sesion}
        detallePedidos={detallePedidos}
        totalMesa={totalMesa}
        onCobroCompletado={handleCobroCompletado}
      />
    </>
  );
}