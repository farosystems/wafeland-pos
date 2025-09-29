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
import { getArticles } from "@/services/articles";

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

  // Estados para descuentos y artículos adicionales (solo cuando esPorCobrar)
  const [descuentosIndividuales, setDescuentosIndividuales] = React.useState<Record<number, number>>({});
  const [descuentoGeneral, setDescuentoGeneral] = React.useState<number>(0);
  const [tipoDescuentoGeneral, setTipoDescuentoGeneral] = React.useState<'porcentaje' | 'fijo'>('porcentaje');
  const [tiposDescuentoIndividual, setTiposDescuentoIndividual] = React.useState<Record<number, 'porcentaje' | 'fijo'>>({});
  const [articulosAdicionales, setArticulosAdicionales] = React.useState<Array<{
    id: string;
    fk_id_articulo: number;
    cantidad: number;
    precio_unitario: number;
    descripcion: string;
  }>>([]);
  const [articulos, setArticulos] = React.useState<Article[]>([]);

  // Reset estados cuando se abre/cierra el modal
  React.useEffect(() => {
    if (isOpen && estadoMesa?.sesion_activa) {
      refetchPedidos();
      // Reset estados de descuentos y artículos adicionales
      setDescuentosIndividuales({});
      setDescuentoGeneral(0);
      setTipoDescuentoGeneral('porcentaje');
      setTiposDescuentoIndividual({});
      setArticulosAdicionales([]);

      // Cargar artículos si la mesa está por cobrar
      if (estadoMesa.estado === 'por_cobrar') {
        getArticles().then(setArticulos);
      }
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

  // Funciones auxiliares para descuentos y artículos adicionales
  const calcularTotalConDescuentos = () => {
    if (!esPorCobrar) return totalMesa;

    // Calcular subtotal de pedidos originales con descuentos individuales
    const subtotalPedidos = detallePedidos.reduce((sum, detalle) => {
      const descuento = descuentosIndividuales[detalle.id] || 0;
      const tipoDescuento = tiposDescuentoIndividual[detalle.id] || 'fijo';

      let precioConDescuento = detalle.precio_unitario;
      if (descuento > 0) {
        if (tipoDescuento === 'porcentaje') {
          const descuentoMonto = (detalle.precio_unitario * descuento) / 100;
          precioConDescuento = Math.max(0, detalle.precio_unitario - descuentoMonto);
        } else {
          precioConDescuento = Math.max(0, detalle.precio_unitario - descuento);
        }
      }

      return sum + (precioConDescuento * detalle.cantidad);
    }, 0);

    // Calcular subtotal de artículos adicionales con descuentos
    const subtotalAdicionales = articulosAdicionales.reduce((sum, articulo) => {
      const articuloIdNum = parseInt(articulo.id);
      const descuentoValor = descuentosIndividuales[articuloIdNum] || 0;
      const tipoDescuento = tiposDescuentoIndividual[articuloIdNum] || 'fijo';

      let precioConDescuento = articulo.precio_unitario;
      if (descuentoValor > 0) {
        if (tipoDescuento === 'porcentaje') {
          const descuentoAplicado = (articulo.precio_unitario * descuentoValor) / 100;
          precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoAplicado);
        } else {
          precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoValor);
        }
      }

      return sum + (precioConDescuento * articulo.cantidad);
    }, 0);

    const subtotalTotal = subtotalPedidos + subtotalAdicionales;

    // Aplicar descuento general
    if (descuentoGeneral > 0) {
      if (tipoDescuentoGeneral === 'porcentaje') {
        const descuentoMonto = (subtotalTotal * descuentoGeneral) / 100;
        return Math.max(0, subtotalTotal - descuentoMonto);
      } else {
        return Math.max(0, subtotalTotal - descuentoGeneral);
      }
    }

    return subtotalTotal;
  };

  const agregarArticuloAdicional = () => {
    const nuevoId = Date.now().toString();
    setArticulosAdicionales(prev => [...prev, {
      id: nuevoId,
      fk_id_articulo: 0,
      cantidad: 1,
      precio_unitario: 0,
      descripcion: ""
    }]);
  };

  const eliminarArticuloAdicional = (id: string) => {
    setArticulosAdicionales(prev => prev.filter(art => art.id !== id));
  };

  const actualizarArticuloAdicional = (id: string, campo: string, valor: any) => {
    setArticulosAdicionales(prev => prev.map(art => {
      if (art.id === id) {
        if (campo === 'fk_id_articulo') {
          const articuloSeleccionado = articulos.find(a => a.id === parseInt(valor));
          return {
            ...art,
            fk_id_articulo: parseInt(valor),
            descripcion: articuloSeleccionado?.descripcion || "",
            precio_unitario: articuloSeleccionado?.precio_unitario || 0
          };
        }
        return { ...art, [campo]: valor };
      }
      return art;
    }));
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

  if (!estadoMesa || !estadoMesa.sesion_activa) {
    return null;
  }

  const sesion = estadoMesa.sesion_activa;
  const esPorCobrar = estadoMesa.estado === 'por_cobrar';

  // Calcular totales
  const totalMesa = detallePedidos.reduce((sum, item) => sum + item.subtotal, 0);
  const totalProductos = detallePedidos.reduce((sum, item) => sum + item.cantidad, 0);
  const totalFinal = esPorCobrar ? calcularTotalConDescuentos() : totalMesa;

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
                  Total: ${totalFinal.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalProductos + articulosAdicionales.reduce((sum, a) => sum + a.cantidad, 0)} productos
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
                descuentosIndividuales={descuentosIndividuales}
                descuentoGeneral={descuentoGeneral}
                tipoDescuentoGeneral={tipoDescuentoGeneral}
                tiposDescuentoIndividual={tiposDescuentoIndividual}
                articulosAdicionales={articulosAdicionales}
                onDescuentoIndividualChange={(detalleId, descuento) =>
                  setDescuentosIndividuales(prev => ({ ...prev, [detalleId]: descuento }))
                }
                onDescuentoGeneralChange={setDescuentoGeneral}
                onTipoDescuentoGeneralChange={setTipoDescuentoGeneral}
                onTipoDescuentoIndividualChange={(detalleId, tipo) =>
                  setTiposDescuentoIndividual(prev => ({ ...prev, [detalleId]: tipo }))
                }
                onAgregarArticulo={agregarArticuloAdicional}
                onEliminarArticuloAdicional={eliminarArticuloAdicional}
                onActualizarArticuloAdicional={actualizarArticuloAdicional}
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
        detallePedidos={[
          // Pedidos originales con descuentos aplicados
          ...detallePedidos.map(detalle => {
            const descuento = descuentosIndividuales[detalle.id] || 0;
            const tipoDescuento = tiposDescuentoIndividual[detalle.id] || 'fijo';

            let precioConDescuento = detalle.precio_unitario;
            if (descuento > 0) {
              if (tipoDescuento === 'porcentaje') {
                const descuentoMonto = (detalle.precio_unitario * descuento) / 100;
                precioConDescuento = Math.max(0, detalle.precio_unitario - descuentoMonto);
              } else {
                precioConDescuento = Math.max(0, detalle.precio_unitario - descuento);
              }
            }

            return {
              ...detalle,
              precio_unitario: precioConDescuento,
              subtotal: precioConDescuento * detalle.cantidad
            };
          }),
          // Artículos adicionales con descuentos aplicados
          ...articulosAdicionales.map(articulo => {
            const articuloIdNum = parseInt(articulo.id);
            const descuentoValor = descuentosIndividuales[articuloIdNum] || 0;
            const tipoDescuento = tiposDescuentoIndividual[articuloIdNum] || 'fijo';

            let precioConDescuento = articulo.precio_unitario;
            if (descuentoValor > 0) {
              if (tipoDescuento === 'porcentaje') {
                const descuentoAplicado = (articulo.precio_unitario * descuentoValor) / 100;
                precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoAplicado);
              } else {
                precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoValor);
              }
            }

            return {
              id: 0,
              fk_id_pedido_mesa: 0,
              fk_id_articulo: articulo.fk_id_articulo,
              cantidad: articulo.cantidad,
              precio_unitario: precioConDescuento,
              subtotal: articulo.cantidad * precioConDescuento,
              observaciones: "Artículo adicional",
              entregado: true,
              fecha_creado: new Date().toISOString(),
              articulo_descripcion: articulo.descripcion
            };
          })
        ]}
        totalMesa={(() => {
          // Calcular el subtotal con todos los descuentos individuales aplicados
          const subtotalConDescuentos = detallePedidos.reduce((sum, detalle) => {
            const descuento = descuentosIndividuales[detalle.id] || 0;
            const tipoDescuento = tiposDescuentoIndividual[detalle.id] || 'fijo';

            let precioConDescuento = detalle.precio_unitario;
            if (descuento > 0) {
              if (tipoDescuento === 'porcentaje') {
                const descuentoMonto = (detalle.precio_unitario * descuento) / 100;
                precioConDescuento = Math.max(0, detalle.precio_unitario - descuentoMonto);
              } else {
                precioConDescuento = Math.max(0, detalle.precio_unitario - descuento);
              }
            }

            return sum + (precioConDescuento * detalle.cantidad);
          }, 0) + articulosAdicionales.reduce((sum, articulo) => {
            const articuloIdNum = parseInt(articulo.id);
            const descuentoValor = descuentosIndividuales[articuloIdNum] || 0;
            const tipoDescuento = tiposDescuentoIndividual[articuloIdNum] || 'fijo';

            let precioConDescuento = articulo.precio_unitario;
            if (descuentoValor > 0) {
              if (tipoDescuento === 'porcentaje') {
                const descuentoAplicado = (articulo.precio_unitario * descuentoValor) / 100;
                precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoAplicado);
              } else {
                precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoValor);
              }
            }

            return sum + (precioConDescuento * articulo.cantidad);
          }, 0);

          // Aplicar descuento general
          if (descuentoGeneral > 0) {
            if (tipoDescuentoGeneral === 'porcentaje') {
              const descuentoMonto = (subtotalConDescuentos * descuentoGeneral) / 100;
              return Math.max(0, subtotalConDescuentos - descuentoMonto);
            } else {
              return Math.max(0, subtotalConDescuentos - descuentoGeneral);
            }
          }

          return subtotalConDescuentos;
        })()}
        onCobroCompletado={handleCobroCompletado}
      />
    </>
  );
}