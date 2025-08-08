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
      setError("Debe seleccionar una cuenta de tesorería");
      return;
    }
    
    const cuentaId = parseInt(cuentaTesoreriaSeleccionada);
    if (isNaN(cuentaId)) {
      setError("Debe seleccionar una cuenta de tesorería válida");
      return;
    }

    const montoNumero = parseFloat(monto);
    if (isNaN(montoNumero) || montoNumero <= 0) {
      setError("El monto debe ser un número válido mayor a 0");
      return;
    }
    
    if (montoNumero > cuenta.saldo) {
      setError("El monto no puede ser mayor al saldo pendiente");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!usuarioActualId) {
        setError("No se pudo obtener el usuario logueado para registrar el movimiento de caja");
        setLoading(false);
        return;
      }
      // Obtener lote abierto del usuario logueado
      const lote = await getLoteCajaAbiertaPorUsuario(usuarioActualId);
      if (!lote || !lote.id_lote) {
        setError("No se encontró un lote abierto para el usuario logueado");
        setLoading(false);
        return;
      }
      // Registrar el pago con fk_id_lote
      await efectuarPagoCuentaCorriente(
        cuenta.id,
        montoNumero,
        cuentaId,
        lote.id_lote
      );
      // Registrar ingreso en caja por el pago de cuenta corriente
      await registrarMovimientoCaja({
        fk_id_lote: lote.id_lote,
        fk_id_cuenta_tesoreria: cuentaId,
        tipo: "ingreso",
        monto: montoNumero,
      });
      setShowSuccess({ show: true, message: "¡Pago realizado exitosamente!" });
      setTimeout(() => setShowSuccess({ show: false, message: "" }), 2500);
      onPagoRealizado();
      onClose();
      resetForm();
    } catch (error) {
      setError((error as Error).message || "Error al procesar el pago");
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

  if (!cuenta) return null;

  return (
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
  );
} 