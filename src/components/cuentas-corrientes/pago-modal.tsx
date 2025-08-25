"use client";
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, AlertCircle } from "lucide-react";
import { CuentaCorriente } from "@/types/cuentaCorriente";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { efectuarPagoCuentaCorriente } from "@/services/pagosCuentaCorriente";
import { formatCurrency } from "@/lib/utils";
import { registrarMovimientoCaja } from "@/services/detalleLotesOperaciones";
import { getLoteCajaAbiertaPorUsuario } from "@/services/lotesOperaciones";
import { toast } from "sonner";

interface PagoModalProps {
  cuenta: CuentaCorriente | null;
  isOpen: boolean;
  onClose: () => void;
  onPagoRealizado: () => void;
  usuarioActualId: number | null;
}

// Función para formatear número con separadores de miles
const formatNumberWithCommas = (value: string): string => {
  // Remover todo excepto números y punto decimal
  const cleanValue = value.replace(/[^\d.]/g, '');
  
  // Si está vacío, retornar vacío
  if (!cleanValue) return '';
  
  // Separar parte entera y decimal
  const parts = cleanValue.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';
  
  // Formatear parte entera con comas
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combinar con decimal si existe
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

// Función para desformatear número (remover comas)
const unformatNumber = (value: string): string => {
  return value.replace(/,/g, '');
};

export function PagoModal({ cuenta, isOpen, onClose, onPagoRealizado, usuarioActualId }: PagoModalProps) {
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);
  const [cuentaTesoreriaSeleccionada, setCuentaTesoreriaSeleccionada] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [montoFormateado, setMontoFormateado] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ show: boolean, message: string }>({ show: false, message: "" });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pagoConfirmacion, setPagoConfirmacion] = useState<{ monto: number; cuentaTesoreria: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      cargarCuentasTesoreria();
      if (cuenta) {
        const montoInicial = cuenta.saldo.toString();
        setMonto(montoInicial);
        setMontoFormateado(formatNumberWithCommas(montoInicial));
      }
    }
  }, [isOpen, cuenta]);

  const cargarCuentasTesoreria = async () => {
    try {
      const cuentas = await getCuentasTesoreria();
      setCuentasTesoreria(cuentas);
    } catch{
      setError("Error al cargar cuentas de tesorería");
    }
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = formatNumberWithCommas(value);
    const unformattedValue = unformatNumber(value);
    
    setMontoFormateado(formattedValue);
    setMonto(unformattedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cuenta) return;
    
    // Validaciones
    if (!cuentaTesoreriaSeleccionada) {
      const errorMsg = "Debe seleccionar una cuenta de tesorería";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    const cuentaId = parseInt(cuentaTesoreriaSeleccionada);
    if (isNaN(cuentaId)) {
      const errorMsg = "Debe seleccionar una cuenta de tesorería válida";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const montoNumero = parseFloat(monto);
    if (isNaN(montoNumero) || montoNumero <= 0) {
      const errorMsg = "El monto debe ser un número válido mayor a 0";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    if (montoNumero > cuenta.saldo) {
      const errorMsg = "El monto no puede ser mayor al saldo pendiente";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Mostrar confirmación
    const cuentaTesoreriaNombre = cuentasTesoreria.find(ct => ct.id === cuentaId)?.descripcion || "Cuenta no encontrada";
    setPagoConfirmacion({
      monto: montoNumero,
      cuentaTesoreria: cuentaTesoreriaNombre
    });
    setShowConfirmation(true);
  };

  const handleConfirmarPago = async () => {
    if (!cuenta || !pagoConfirmacion) return;

    setLoading(true);
    setError(null);
    setShowConfirmation(false);

    try {
      if (!usuarioActualId) {
        const errorMsg = "No se pudo obtener el usuario logueado para registrar el movimiento de caja";
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
      // Obtener lote abierto del usuario logueado
      const lote = await getLoteCajaAbiertaPorUsuario(usuarioActualId);
      if (!lote || !lote.id_lote) {
        const errorMsg = "No se encontró un lote abierto para el usuario logueado";
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
        return;
      }
      
      const cuentaId = parseInt(cuentaTesoreriaSeleccionada);
      
      // Registrar el pago con fk_id_lote
      await efectuarPagoCuentaCorriente(
        cuenta.id,
        pagoConfirmacion.monto,
        cuentaId,
        lote.id_lote
      );
      // Registrar ingreso en caja por el pago de cuenta corriente
      await registrarMovimientoCaja({
        fk_id_lote: lote.id_lote,
        fk_id_cuenta_tesoreria: cuentaId,
        tipo: "ingreso",
        monto: pagoConfirmacion.monto,
      });
      
      // Mostrar toast de éxito
      toast.success(`¡Pago de ${formatCurrency(pagoConfirmacion.monto)} realizado exitosamente!`, {
        description: `Cuenta Corriente #${cuenta.id} - ${pagoConfirmacion.cuentaTesoreria}`,
        duration: 4000,
      });
      
      setShowSuccess({ show: true, message: "¡Pago realizado exitosamente!" });
      setTimeout(() => setShowSuccess({ show: false, message: "" }), 2500);
      onPagoRealizado();
      onClose();
      resetForm();
    } catch (error) {
      const errorMessage = (error as Error).message || "Error al procesar el pago";
      setError(errorMessage);
      
      // Mostrar toast de error
      toast.error("Error al procesar el pago", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMonto("");
    setMontoFormateado("");
    setCuentaTesoreriaSeleccionada("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCancelarConfirmacion = () => {
    setShowConfirmation(false);
    setPagoConfirmacion(null);
  };

  if (!cuenta) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Efectuar Pago - Cuenta Corriente #{cuenta.id}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información de la cuenta */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Saldo pendiente:</span>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(cuenta.saldo)}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Total original:</span>
                  <div className="text-lg font-bold">
                    {formatCurrency(cuenta.total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cuenta de Tesorería */}
            <div className="space-y-2">
              <Label htmlFor="cuenta-tesoreria">Cuenta de Tesorería *</Label>
              <Select value={cuentaTesoreriaSeleccionada} onValueChange={setCuentaTesoreriaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una cuenta de tesorería" />
                </SelectTrigger>
                <SelectContent>
                  {cuentasTesoreria
                    .filter((ct) => ct.descripcion !== "CUENTA CORRIENTE")
                    .map((ct) => (
                      <SelectItem key={ct.id} value={ct.id.toString()}>
                        {ct.descripcion}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Monto a pagar */}
            <div className="space-y-2">
              <Label htmlFor="monto">Monto a pagar *</Label>
              <Input
                id="monto"
                type="text"
                value={montoFormateado}
                onChange={handleMontoChange}
                placeholder="0"
                className="text-lg font-medium"
              />
              <div className="text-xs text-gray-500">
                Máximo: {formatCurrency(cuenta.saldo)}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            )}

            {showSuccess.show && (
              <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-lg animate-fade-in">
                {showSuccess.message}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !cuentaTesoreriaSeleccionada || !monto}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Confirmar Pago
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación */}
      <Dialog open={showConfirmation} onOpenChange={handleCancelarConfirmacion}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Confirmar Pago
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Detalles del pago:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Cuenta Corriente:</span>
                  <span className="font-medium">#{cuenta?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Monto a pagar:</span>
                  <span className="font-bold text-green-600">
                    {pagoConfirmacion ? formatCurrency(pagoConfirmacion.monto) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Cuenta de tesorería:</span>
                  <span className="font-medium">{pagoConfirmacion?.cuentaTesoreria || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Saldo restante:</span>
                  <span className="font-medium">
                    {cuenta && pagoConfirmacion ? formatCurrency(cuenta.saldo - pagoConfirmacion.monto) : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800 mb-1">¿Está seguro que desea proceder?</p>
                  <p className="text-yellow-700">Esta acción registrará el pago y actualizará el saldo de la cuenta corriente.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelarConfirmacion}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmarPago}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Confirmar Pago
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 