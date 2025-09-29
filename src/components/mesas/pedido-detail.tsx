"use client";

import * as React from "react";
import { IconPlus, IconMinus, IconClock, IconUsers, IconX, IconTrash, IconShoppingCart } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mesa, SesionMesaActiva, PedidoMesa, DetallePedidoMesa } from "@/types/mesa";
import { getArticles } from "@/services/articles";
import { Article } from "@/types/article";

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
  // Nuevas props para descuentos y artículos adicionales
  descuentosIndividuales?: Record<number, number>;
  descuentoGeneral?: number;
  tipoDescuentoGeneral?: 'porcentaje' | 'fijo';
  tiposDescuentoIndividual?: Record<number, 'porcentaje' | 'fijo'>;
  articulosAdicionales?: Array<{
    id: string;
    fk_id_articulo: number;
    cantidad: number;
    precio_unitario: number;
    descripcion: string;
  }>;
  onDescuentoIndividualChange?: (detalleId: number, descuento: number) => void;
  onDescuentoGeneralChange?: (descuento: number) => void;
  onTipoDescuentoGeneralChange?: (tipo: 'porcentaje' | 'fijo') => void;
  onTipoDescuentoIndividualChange?: (detalleId: number, tipo: 'porcentaje' | 'fijo') => void;
  onAgregarArticulo?: () => void;
  onEliminarArticuloAdicional?: (articuloId: string) => void;
  onActualizarArticuloAdicional?: (articuloId: string, campo: string, valor: any) => void;
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
  descuentosIndividuales = {},
  descuentoGeneral = 0,
  tipoDescuentoGeneral = 'porcentaje',
  tiposDescuentoIndividual = {},
  articulosAdicionales = [],
  onDescuentoIndividualChange,
  onDescuentoGeneralChange,
  onTipoDescuentoGeneralChange,
  onTipoDescuentoIndividualChange,
  onAgregarArticulo,
  onEliminarArticuloAdicional,
  onActualizarArticuloAdicional,
}: PedidoDetailProps) {

  const [articulos, setArticulos] = React.useState<Article[]>([]);
  const [mostrarAgregarArticulos, setMostrarAgregarArticulos] = React.useState(false);
  const [busquedasArticulos, setBusquedasArticulos] = React.useState<Record<string, string>>({});
  const [articulosFiltrados, setArticulosFiltrados] = React.useState<Record<string, Article[]>>({});

  // Cargar artículos cuando sea necesario
  React.useEffect(() => {
    if (esPorCobrar) {
      getArticles().then(setArticulos);
    }
  }, [esPorCobrar]);

  // Funciones auxiliares para descuentos
  const calcularPrecioConDescuento = (precio: number, detalleId: number) => {
    const descuento = descuentosIndividuales[detalleId] || 0;
    const tipoDescuento = tiposDescuentoIndividual[detalleId] || 'fijo';

    if (descuento === 0) return precio;

    if (tipoDescuento === 'porcentaje') {
      const descuentoMonto = (precio * descuento) / 100;
      return Math.max(0, precio - descuentoMonto);
    } else {
      return Math.max(0, precio - descuento);
    }
  };

  const calcularTotalConDescuentos = () => {
    if (!esPorCobrar) return totalMesa;

    // Calcular subtotal de pedidos originales con descuentos individuales
    const subtotalPedidos = detallePedidos.reduce((sum, detalle) => {
      const precioConDescuento = calcularPrecioConDescuento(detalle.precio_unitario, detalle.id);
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

  // Funciones para búsqueda de artículos
  const actualizarBusquedaArticulo = (articuloId: string, busqueda: string) => {
    setBusquedasArticulos(prev => ({ ...prev, [articuloId]: busqueda }));

    if (busqueda.trim() === '') {
      setArticulosFiltrados(prev => ({ ...prev, [articuloId]: [] }));
      return;
    }

    const filtrados = articulos.filter(articulo =>
      articulo.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      articulo.id.toString().includes(busqueda)
    ).slice(0, 5); // Limitar a 5 resultados

    setArticulosFiltrados(prev => ({ ...prev, [articuloId]: filtrados }));
  };

  const seleccionarArticulo = (articuloId: string, articulo: Article) => {
    setBusquedasArticulos(prev => ({ ...prev, [articuloId]: articulo.descripcion }));
    setArticulosFiltrados(prev => ({ ...prev, [articuloId]: [] }));

    // Actualizar todos los campos del artículo
    onActualizarArticuloAdicional?.(articuloId, 'fk_id_articulo', articulo.id);
    onActualizarArticuloAdicional?.(articuloId, 'descripcion', articulo.descripcion);
    onActualizarArticuloAdicional?.(articuloId, 'precio_unitario', articulo.precio_unitario || 0);
  };

  const limpiarBusquedaArticulo = (articuloId: string) => {
    setBusquedasArticulos(prev => ({ ...prev, [articuloId]: '' }));
    setArticulosFiltrados(prev => ({ ...prev, [articuloId]: [] }));
  };

  const eliminarArticuloConLimpieza = (articuloId: string) => {
    limpiarBusquedaArticulo(articuloId);
    onEliminarArticuloAdicional?.(articuloId);
  };

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

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Lista de productos */}
        <div className="flex-1 overflow-auto px-6 min-h-[200px]">
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
              {detallePedidos.map((detalle) => {
                const precioConDescuento = esPorCobrar ? calcularPrecioConDescuento(detalle.precio_unitario, detalle.id) : detalle.precio_unitario;
                const descuentoValor = esPorCobrar ? (descuentosIndividuales[detalle.id] || 0) : 0;
                const tipoDescuento = tiposDescuentoIndividual[detalle.id] || 'fijo';
                const subtotalConDescuento = precioConDescuento * detalle.cantidad;

                // Calcular el monto de descuento aplicado
                let descuentoAplicado = 0;
                if (descuentoValor > 0) {
                  if (tipoDescuento === 'porcentaje') {
                    descuentoAplicado = (detalle.precio_unitario * descuentoValor) / 100;
                  } else {
                    descuentoAplicado = descuentoValor;
                  }
                }

                return (
                  <div
                    key={detalle.id}
                    className={`border rounded-lg transition-colors ${
                      esPorCobrar ? "p-3 bg-white" : "p-3 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {esPorCobrar ? (
                      // Vista para cobrar con descuentos
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{detalle.articulo_descripcion}</h4>
                            <div className="text-xs text-muted-foreground">
                              Cantidad: {detalle.cantidad}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Precio original: ${detalle.precio_unitario.toLocaleString()}
                            </div>
                            {descuentoAplicado > 0 && (
                              <div className="text-xs text-green-600">
                                Descuento: -{tipoDescuento === 'porcentaje' ? `${descuentoValor}%` : `$${descuentoAplicado.toLocaleString()}`}
                                {tipoDescuento === 'porcentaje' && ` ($${descuentoAplicado.toLocaleString()})`}
                              </div>
                            )}
                            {detalle.observaciones && (
                              <p className="text-xs text-blue-600 mt-1 italic">
                                &ldquo;{detalle.observaciones}&rdquo;
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              ${subtotalConDescuento.toLocaleString()}
                            </div>
                            <div className="mt-1 flex gap-1">
                              <Select
                                value={tipoDescuento}
                                onValueChange={(value: 'porcentaje' | 'fijo') =>
                                  onTipoDescuentoIndividualChange?.(detalle.id, value)
                                }
                              >
                                <SelectTrigger className="w-12 h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="porcentaje">%</SelectItem>
                                  <SelectItem value="fijo">$</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                placeholder="0"
                                value={descuentosIndividuales[detalle.id] || ""}
                                onChange={(e) => onDescuentoIndividualChange?.(detalle.id, parseFloat(e.target.value) || 0)}
                                className="w-16 h-6 text-xs"
                                min="0"
                                max={tipoDescuento === 'porcentaje' ? 100 : detalle.precio_unitario}
                                step="0.01"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Vista normal (no para cobrar)
                      <div className="flex items-center gap-3">
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
                              disabled={loading}
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
                              disabled={loading}
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
                            disabled={loading || mesaCerrada}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <IconX className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Artículos adicionales */}
              {esPorCobrar && articulosAdicionales.length > 0 && (
                <>
                  <Separator className="my-2" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-blue-600">Artículos Adicionales</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {articulosAdicionales.map((articulo) => {
                      const articuloIdNum = parseInt(articulo.id);
                      const descuentoValor = descuentosIndividuales[articuloIdNum] || 0;
                      const tipoDescuento = tiposDescuentoIndividual[articuloIdNum] || 'fijo';

                      // Calcular precio con descuento
                      let precioConDescuento = articulo.precio_unitario;
                      let descuentoAplicado = 0;
                      if (descuentoValor > 0) {
                        if (tipoDescuento === 'porcentaje') {
                          descuentoAplicado = (articulo.precio_unitario * descuentoValor) / 100;
                          precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoAplicado);
                        } else {
                          descuentoAplicado = descuentoValor;
                          precioConDescuento = Math.max(0, articulo.precio_unitario - descuentoValor);
                        }
                      }

                      const subtotalConDescuento = precioConDescuento * articulo.cantidad;

                      return (
                        <div key={articulo.id} className="border rounded p-3 bg-blue-50">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{articulo.descripcion}</div>
                                <div className="text-xs text-muted-foreground">
                                  Cantidad: {articulo.cantidad}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Precio original: ${articulo.precio_unitario.toLocaleString()}
                                </div>
                                {descuentoAplicado > 0 && (
                                  <div className="text-xs text-green-600">
                                    Descuento: -{tipoDescuento === 'porcentaje' ? `${descuentoValor}%` : `$${descuentoAplicado.toLocaleString()}`}
                                    {tipoDescuento === 'porcentaje' && ` ($${descuentoAplicado.toLocaleString()})`}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-sm">
                                  ${subtotalConDescuento.toLocaleString()}
                                </div>
                                <div className="mt-1 flex gap-1">
                                  <Select
                                    value={tipoDescuento}
                                    onValueChange={(value: 'porcentaje' | 'fijo') =>
                                      onTipoDescuentoIndividualChange?.(articuloIdNum, value)
                                    }
                                  >
                                    <SelectTrigger className="w-12 h-6 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="porcentaje">%</SelectItem>
                                      <SelectItem value="fijo">$</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={descuentosIndividuales[articuloIdNum] || ""}
                                    onChange={(e) => onDescuentoIndividualChange?.(articuloIdNum, parseFloat(e.target.value) || 0)}
                                    className="w-16 h-6 text-xs"
                                    min="0"
                                    max={tipoDescuento === 'porcentaje' ? 100 : articulo.precio_unitario}
                                    step="0.01"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => eliminarArticuloConLimpieza(articulo.id)}
                                  className="h-6 w-6 p-0 text-red-600 mt-1"
                                >
                                  <IconTrash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sección de descuentos y agregar artículos - Scrolleable */}
        {esPorCobrar && (
          <div className="border-t bg-gray-50 p-4 max-h-60 overflow-y-auto flex-shrink-0">
            <div className="space-y-3">
              {/* Descuento General */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Descuento General</Label>
                <div className="flex gap-2">
                  <Select
                    value={tipoDescuentoGeneral}
                    onValueChange={onTipoDescuentoGeneralChange}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="porcentaje">%</SelectItem>
                      <SelectItem value="fijo">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0"
                    value={descuentoGeneral || ""}
                    onChange={(e) => onDescuentoGeneralChange?.(parseFloat(e.target.value) || 0)}
                    className="flex-1"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Botón para agregar artículos */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMostrarAgregarArticulos(!mostrarAgregarArticulos)}
                  className="gap-2 flex-1"
                >
                  <IconShoppingCart className="h-4 w-4" />
                  {mostrarAgregarArticulos ? "Ocultar" : "Agregar Artículos"}
                </Button>
              </div>

              {/* Sección para agregar artículos */}
              {mostrarAgregarArticulos && (
                <div className="border rounded-lg p-3 bg-white">
                  <div className="space-y-3">
                    {articulosAdicionales.map((articulo) => (
                      <div key={articulo.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4 relative">
                          <Label className="text-xs">Artículo</Label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Buscar artículo..."
                              value={busquedasArticulos[articulo.id] || ''}
                              onChange={(e) => actualizarBusquedaArticulo(articulo.id, e.target.value)}
                              className="h-8 text-xs pr-6"
                            />
                            {busquedasArticulos[articulo.id] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => limpiarBusquedaArticulo(articulo.id)}
                                className="absolute right-1 top-1 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                              >
                                <IconX className="h-3 w-3" />
                              </Button>
                            )}
                            {/* Dropdown de resultados */}
                            {articulosFiltrados[articulo.id] && articulosFiltrados[articulo.id].length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {articulosFiltrados[articulo.id].map((art) => (
                                  <div
                                    key={art.id}
                                    className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100"
                                    onClick={() => seleccionarArticulo(articulo.id, art)}
                                  >
                                    <div className="font-medium">{art.descripcion}</div>
                                    <div className="text-gray-500 text-xs">
                                      ID: {art.id} | Precio: ${art.precio_unitario?.toLocaleString() || '0'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Cant.</Label>
                          <Input
                            type="number"
                            value={articulo.cantidad}
                            onChange={(e) => onActualizarArticuloAdicional?.(articulo.id, 'cantidad', parseInt(e.target.value) || 1)}
                            className="h-8 text-xs"
                            min="1"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Precio</Label>
                          <Input
                            type="number"
                            value={articulo.precio_unitario}
                            onChange={(e) => onActualizarArticuloAdicional?.(articulo.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Total</Label>
                          <div className="text-xs font-medium">
                            ${(articulo.cantidad * articulo.precio_unitario).toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => eliminarArticuloConLimpieza(articulo.id)}
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <IconTrash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onAgregarArticulo}
                      className="gap-2 w-full"
                    >
                      <IconPlus className="h-3 w-3" />
                      Agregar Artículo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total y botones - Siempre visibles */}
        <div className="border-t bg-white p-6 space-y-4 flex-shrink-0">
          {/* Total */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Productos ({detallePedidos.reduce((sum, d) => sum + d.cantidad, 0) + articulosAdicionales.reduce((sum, a) => sum + a.cantidad, 0)}):</span>
              <span>${(esPorCobrar ? calcularTotalConDescuentos() : totalMesa).toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span>${(esPorCobrar ? calcularTotalConDescuentos() : totalMesa).toLocaleString()}</span>
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
                disabled={loading || calcularTotalConDescuentos() === 0}
                className="w-full"
                size="lg"
              >
                Cobrar Mesa
              </Button>
            )}

            {esPorCobrar && calcularTotalConDescuentos() > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Puedes aplicar descuentos y agregar artículos antes de cobrar.
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