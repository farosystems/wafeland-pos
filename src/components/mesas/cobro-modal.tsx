"use client";

import * as React from "react";
import { IconCurrencyDollar, IconPrinter, IconCheck, IconCreditCard } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mesa, SesionMesaActiva, DetallePedidoMesa } from "@/types/mesa";
import { procesarCobroMesa } from "@/app/actions/cobro-mesa";
import { generarTicketPDF, imprimirTicketHTML } from "@/utils/ticket-generator";
import { getCuentasTesoreria, CuentaTesoreria } from "@/services/cuentas-tesoreria";
import { getTiposComprobantes } from "@/services/tipos-comprobantes";
import { toast } from "sonner";

interface CobroModalProps {
  isOpen: boolean;
  onClose: () => void;
  mesa: Mesa;
  sesion: SesionMesaActiva;
  detallePedidos: DetallePedidoMesa[];
  totalMesa: number;
  onCobroCompletado: () => void;
}

export function CobroModal({
  isOpen,
  onClose,
  mesa,
  sesion,
  detallePedidos,
  totalMesa,
  onCobroCompletado,
}: CobroModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [cobroCompletado, setCobroCompletado] = React.useState(false);
  const [ordenVentaId, setOrdenVentaId] = React.useState<number | null>(null);
  
  // Estados para medios de pago
  const [cuentasTesoreria, setCuentasTesoreria] = React.useState<CuentaTesoreria[]>([]);
  const [medioSeleccionado, setMedioSeleccionado] = React.useState<string>("");
  
  // Estados para tipos de comprobante
  const [tipoSeleccionado, setTipoSeleccionado] = React.useState<string>("");

  // Reset estado cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      setCobroCompletado(false);
      setOrdenVentaId(null);
      setMedioSeleccionado("");
      setTipoSeleccionado("");
      
      // Cargar datos necesarios para el cobro
      const loadDatosCobro = async () => {
        try {
          // Cargar cuentas de tesorería
          const cuentas = await getCuentasTesoreria();
          setCuentasTesoreria(cuentas);
          
          // Seleccionar "Efectivo" por defecto si existe
          const efectivo = cuentas.find(c => c.descripcion.toLowerCase().includes('efectivo'));
          if (efectivo) {
            setMedioSeleccionado(efectivo.id.toString());
          }

          // Cargar tipos de comprobante
          const tipos = await getTiposComprobantes();
          
          // Seleccionar "FACTURA" por defecto si existe
          const factura = tipos.find(t => t.descripcion.toUpperCase().includes('FACTURA'));
          if (factura) {
            setTipoSeleccionado(factura.id.toString());
          }
        } catch (error) {
          console.error("Error al cargar datos de cobro:", error);
          toast.error("Error al cargar información de cobro");
        }
      };
      
      loadDatosCobro();
    }
  }, [isOpen]);

  const handleProcesarCobro = async () => {
    if (!medioSeleccionado) {
      toast.error("Debes seleccionar un medio de pago");
      return;
    }

    if (!tipoSeleccionado) {
      toast.error("Debes seleccionar un tipo de comprobante");
      return;
    }

    setLoading(true);
    try {
      const ordenVenta = await procesarCobroMesa({
        sesionId: sesion.sesion_id,
        detallePedidos,
        total: totalMesa,
        mediopagoId: parseInt(medioSeleccionado),
        tipoComprobanteId: parseInt(tipoSeleccionado),
      });

      setOrdenVentaId(ordenVenta.id);
      setCobroCompletado(true);
      toast.success(`Cobro procesado - Orden #${ordenVenta.id}`);
    } catch (error) {
      console.error("Error al procesar cobro:", error);
      toast.error("Error al procesar el cobro");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarTicket = async () => {
    if (!ordenVentaId) return;

    try {
      const medioSeleccionadoNombre = cuentasTesoreria.find(c => c.id.toString() === medioSeleccionado)?.descripcion || 'Efectivo';
      
      await generarTicketPDF({
        ordenId: ordenVentaId,
        mesa,
        detallePedidos,
        total: totalMesa,
        fecha: new Date(),
        medioPago: medioSeleccionadoNombre,
      });
      
      toast.success("Ticket generado correctamente");
    } catch (error) {
      console.error("Error al generar ticket:", error);
      toast.error("Error al generar el ticket");
    }
  };

  const handleImprimir = () => {
    if (!ordenVentaId) return;

    try {
      const medioSeleccionadoNombre = cuentasTesoreria.find(c => c.id.toString() === medioSeleccionado)?.descripcion || 'Efectivo';
      
      imprimirTicketHTML({
        ordenId: ordenVentaId,
        mesa,
        detallePedidos,
        total: totalMesa,
        fecha: new Date(),
        medioPago: medioSeleccionadoNombre,
      });
      
      toast.success("Enviando ticket a impresora...");
    } catch (error) {
      console.error("Error al imprimir:", error);
      toast.error("Error al imprimir el ticket");
    }
  };

  const handleFinalizar = () => {
    onCobroCompletado();
  };

  // Formatear fecha/hora
  const fechaHora = new Date().toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconCurrencyDollar className="h-5 w-5" />
            {cobroCompletado ? "Cobro Completado" : `Cobrar Mesa ${mesa.numero}`}
          </DialogTitle>
          <DialogDescription>
            {cobroCompletado 
              ? `Orden de venta #${ordenVentaId} generada exitosamente`
              : "Confirma los detalles del cobro antes de procesar"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la mesa */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mesa {mesa.numero}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Comensales:</span>
                <span>{sesion.comensales}</span>
              </div>
              <div className="flex justify-between">
                <span>Atendió:</span>
                <span>{sesion.usuario_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{fechaHora}</span>
              </div>
              {cobroCompletado && ordenVentaId && (
                <div className="flex justify-between font-medium">
                  <span>Orden #:</span>
                  <Badge variant="default">{ordenVentaId}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalle de productos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Productos Consumidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {detallePedidos.map((detalle) => (
                  <div key={detalle.id} className="flex justify-between items-center text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{detalle.articulo_descripcion}</div>
                      <div className="text-xs text-muted-foreground">
                        ${detalle.precio_unitario.toLocaleString()} × {detalle.cantidad}
                      </div>
                    </div>
                    <div className="font-medium">
                      ${detalle.subtotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              <div className="flex justify-between items-center font-bold">
                <span>TOTAL:</span>
                <span className="text-lg">${totalMesa.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Selección de medio de pago */}
          {!cobroCompletado && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconCreditCard className="h-4 w-4" />
                  Medio de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="medio-pago">Seleccionar método de pago *</Label>
                  <Select value={medioSeleccionado} onValueChange={setMedioSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar medio de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasTesoreria.map((cuenta) => (
                        <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                          <div className="flex items-center gap-2">
                            <IconCurrencyDollar className="h-4 w-4" />
                            {cuenta.descripcion}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <h4 className="font-medium mb-2">Detalles del Comprobante:</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Tipo: Factura</li>
                    <li>• Cliente: Consumidor Final</li>
                    <li>• Se generará orden de venta automáticamente</li>
                    {medioSeleccionado && (
                      <li>
                        • Medio: {cuentasTesoreria.find(c => c.id.toString() === medioSeleccionado)?.descripcion || 'Seleccionado'}
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {!cobroCompletado ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleProcesarCobro} 
                disabled={loading || !medioSeleccionado}
              >
                {loading ? "Procesando..." : "Procesar Cobro"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleGenerarTicket}
                className="gap-2"
              >
                <IconPrinter className="h-4 w-4" />
                Generar Ticket
              </Button>
              <Button 
                variant="outline" 
                onClick={handleImprimir}
                className="gap-2"
              >
                <IconPrinter className="h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleFinalizar} className="gap-2">
                <IconCheck className="h-4 w-4" />
                Finalizar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}