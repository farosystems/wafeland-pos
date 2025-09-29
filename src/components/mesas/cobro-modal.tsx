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
  // Estados básicos para el cobro
  const [loading, setLoading] = React.useState(false);
  const [cobroCompletado, setCobroCompletado] = React.useState(false);
  const [ordenVentaId, setOrdenVentaId] = React.useState<number | null>(null);

  // Estados para medios de pago y tipos de comprobante
  const [tiposComprobantes, setTiposComprobantes] = React.useState<{ id: number; descripcion: string; activo: boolean }[]>([]);
  const [cuentasTesoreria, setCuentasTesoreria] = React.useState<CuentaTesoreria[]>([]);
  const [medioSeleccionado, setMedioSeleccionado] = React.useState<string>("");
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
          setTiposComprobantes(tipos);

          // Seleccionar "FACTURA" por defecto si existe
          const factura = tipos.find(t => t.descripcion.toLowerCase().includes('factura'));
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
        detallePedidos: detallePedidos,
        total: totalMesa,
        mediopagoId: parseInt(medioSeleccionado),
        tipoComprobanteId: parseInt(tipoSeleccionado),
      });

      setOrdenVentaId(ordenVenta.id);
      setCobroCompletado(true);
      toast.success("¡Cobro procesado exitosamente!");
    } catch (error) {
      console.error("Error al procesar cobro:", error);
      toast.error("Error al procesar el cobro. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async () => {
    if (!ordenVentaId) return;

    try {
      // Construir objeto TicketData
      const ticketData = {
        ordenId: ordenVentaId,
        mesa: mesa,
        detallePedidos: detallePedidos,
        total: totalMesa,
        fecha: new Date(),
        medioPago: cuentasTesoreria.find(c => c.id.toString() === medioSeleccionado)?.descripcion || 'Efectivo'
      };

      await imprimirTicketHTML(ticketData);
      toast.success("Ticket enviado a impresión");
    } catch (error) {
      console.error("Error al imprimir:", error);
      toast.error("Error al imprimir ticket");
    }
  };

  const handleDescargarPDF = async () => {
    if (!ordenVentaId) return;

    try {
      // Construir objeto TicketData
      const ticketData = {
        ordenId: ordenVentaId,
        mesa: mesa,
        detallePedidos: detallePedidos,
        total: totalMesa,
        fecha: new Date(),
        medioPago: cuentasTesoreria.find(c => c.id.toString() === medioSeleccionado)?.descripcion || 'Efectivo'
      };

      await generarTicketPDF(ticketData);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar PDF");
    }
  };

  const handleFinalizar = () => {
    onCobroCompletado();
  };

  // Formatear fecha y hora
  const fechaHora = new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
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

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
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
              <div className="space-y-3">
                {detallePedidos.map((detalle) => (
                  <div key={detalle.id} className="border rounded p-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{detalle.articulo_descripcion}</div>
                        <div className="text-xs text-muted-foreground">
                          Cantidad: {detalle.cantidad} × ${detalle.precio_unitario.toLocaleString()}
                        </div>
                        {detalle.observaciones && (
                          <div className="text-xs text-blue-600 italic">
                            &quot;{detalle.observaciones}&quot;
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-sm">
                          ${detalle.subtotal.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between items-center font-bold text-lg pt-2">
                  <span>Total:</span>
                  <span className="text-lg">${totalMesa.toLocaleString()}</span>
                </div>
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
                  <Label>Selecciona el medio de pago</Label>
                  <Select value={medioSeleccionado} onValueChange={setMedioSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar medio de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuentasTesoreria.map((cuenta) => (
                        <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                          {cuenta.descripcion}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Efectivo: Pago en billetes y monedas</li>
                    <li>• Transferencia: Pago mediante transferencia bancaria</li>
                    <li>• Tarjeta Débito: Pago con tarjeta de débito</li>
                    <li>• Tarjeta Crédito: Pago con tarjeta de crédito</li>
                    <li>• QR/Billetera: Pago con código QR o billetera digital</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selección de tipo de comprobante */}
          {!cobroCompletado && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <IconCheck className="h-4 w-4" />
                  Tipo de Comprobante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tiposComprobantes.map((tipo) => (
                  <div key={tipo.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`tipo-${tipo.id}`}
                      name="tipoComprobante"
                      value={tipo.id.toString()}
                      checked={tipoSeleccionado === tipo.id.toString()}
                      onChange={(e) => setTipoSeleccionado(e.target.value)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`tipo-${tipo.id}`} className="text-sm">
                      {tipo.descripcion}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex gap-2 flex-shrink-0">
          {!cobroCompletado ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleProcesarCobro}
                disabled={loading || !medioSeleccionado || !tipoSeleccionado}
                className="gap-2"
              >
                <IconCurrencyDollar className="h-4 w-4" />
                {loading ? "Procesando..." : "Procesar Cobro"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleDescargarPDF}
                className="gap-2"
              >
                <IconPrinter className="h-4 w-4" />
                Descargar PDF
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