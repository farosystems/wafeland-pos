"use client";

import * as React from "react";
import { IconPlus, IconMinus, IconClock, IconUsers, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mesa, SesionMesaActiva, PedidoMesa, DetallePedidoMesa } from "@/types/mesa";

interface PedidoDetailProps {
  mesa: Mesa;
  sesion: SesionMesaActiva;
  pedidos: PedidoMesa[];
  detallePedidos: DetallePedidoMesa[];
  totalMesa: number;
  mesaCerrada: boolean;
  loading: boolean;
  onActualizarCantidad: (detalleId: number, nuevaCantidad: number) => void;
  onEliminarProducto: (detalleId: number) => void;
  onCerrarMesa: () => void;
  onCobrar: () => void;
  esPorCobrar?: boolean; // Nuevo prop para indicar si la mesa está por cobrar
}

export function PedidoDetail({
  mesa,
  sesion,
  detallePedidos,
  totalMesa,
  mesaCerrada,
  loading,
  onActualizarCantidad,
  onEliminarProducto,
  onCerrarMesa,
  onCobrar,
  esPorCobrar = false,
}: PedidoDetailProps) {
  
  // Formatear tiempo transcurrido
  const getTiempoTranscurrido = () => {
    const inicio = new Date(sesion.fecha_apertura);
    const ahora = new Date();
    const diffMs = ahora.getTime() - inicio.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutos < 60) {
      return `${diffMinutos} min`;
    } else {
      const horas = Math.floor(diffMinutos / 60);
      const minutos = diffMinutos % 60;
      return `${horas}h ${minutos}min`;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>Pedido Mesa {mesa.numero}</span>
          <Badge variant="secondary" className="text-xs">
            {esPorCobrar ? 'Por Cobrar' : 'Activa'}
          </Badge>
        </CardTitle>
        
        {/* Información de la sesión */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <IconUsers className="h-4 w-4" />
            <span>{sesion.comensales} comensales</span>
          </div>
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4" />
            <span>{getTiempoTranscurrido()}</span>
          </div>
          <div className="text-xs">
            <span>Atendida por: </span>
            <span className="font-medium">{sesion.usuario_nombre}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Lista de productos */}
        <div className="flex-1 overflow-auto px-6">
          {detallePedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm text-center">
                No hay productos en el pedido
              </p>
              <p className="text-xs text-center mt-1">
                Usa la tabla de la izquierda para agregar productos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {detallePedidos.map((detalle) => (
                <div 
                  key={detalle.id} 
                  className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {detalle.articulo_descripcion}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      ${detalle.precio_unitario.toLocaleString()} c/u
                    </p>
                    {detalle.observaciones && (
                      <p className="text-xs text-blue-600 mt-1 italic">
                        &ldquo;{detalle.observaciones}&rdquo;
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onActualizarCantidad(detalle.id, detalle.cantidad - 1)}
                        disabled={loading || esPorCobrar}
                        className="h-6 w-6 p-0"
                      >
                        <IconMinus className="h-3 w-3" />
                      </Button>
                      
                      <span className="text-sm font-medium min-w-[2rem] text-center">
                        {detalle.cantidad}
                      </span>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onActualizarCantidad(detalle.id, detalle.cantidad + 1)}
                        disabled={loading || esPorCobrar}
                        className="h-6 w-6 p-0"
                      >
                        <IconPlus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[4rem]">
                      <p className="text-sm font-semibold">
                        ${detalle.subtotal.toLocaleString()}
                      </p>
                    </div>

                    {/* Botón eliminar */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEliminarProducto(detalle.id)}
                      disabled={loading || mesaCerrada || esPorCobrar}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <IconX className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen y acciones */}
        <div className="border-t bg-white p-6 space-y-4">
          {/* Total */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Productos ({detallePedidos.reduce((sum, d) => sum + d.cantidad, 0)}):</span>
              <span>${totalMesa.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span>${totalMesa.toLocaleString()}</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-2">
            {!esPorCobrar ? (
              <Button
                onClick={onCerrarMesa}
                disabled={loading || detallePedidos.length === 0}
                className="w-full"
                variant="outline"
              >
                {loading ? "Cerrando..." : "Cerrar Mesa"}
              </Button>
            ) : (
              <Button
                onClick={onCobrar}
                disabled={loading || totalMesa === 0}
                className="w-full"
                size="lg"
              >
                Cobrar Mesa
              </Button>
            )}
            
            {esPorCobrar && totalMesa > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                La mesa está lista para cobro. No se pueden modificar los productos.
              </p>
            )}
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="flex items-center justify-center py-2">
              <div className="text-xs text-muted-foreground">
                Procesando...
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}