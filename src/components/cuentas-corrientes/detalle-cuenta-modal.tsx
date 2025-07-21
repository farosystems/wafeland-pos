"use client";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CuentaCorriente } from "@/types/cuentaCorriente";
import { Cliente } from "@/types/cliente";
import { formatCurrency } from "@/lib/utils";
import { Calendar, User, Hash, DollarSign, AlertCircle } from "lucide-react";

interface DetalleCuentaModalProps {
  cuenta: CuentaCorriente | null;
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DetalleCuentaModal({ cuenta, cliente, isOpen, onClose }: DetalleCuentaModalProps) {
  if (!cuenta) return null;

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "pagada":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-blue-600" />
            Cuenta Corriente #{cuenta.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Información del Cliente */}
          {cliente && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Cliente</span>
              </div>
              <div className="text-sm">
                <div className="font-medium">{cliente.razon_social}</div>
                {cliente.tipo_doc === "cuit" && <div className="text-gray-600">CUIT: {cliente.num_doc}</div>}
                {cliente.email && <div className="text-gray-600">Email: {cliente.email}</div>}
              </div>
            </div>
          )}

          {/* Información de la Cuenta */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">Detalles de la Cuenta</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Total Original:</span>
                <div className="font-bold text-lg">{formatCurrency(cuenta.total)}</div>
              </div>
              <div>
                <span className="text-gray-600">Saldo Pendiente:</span>
                <div className={`font-bold text-lg ${cuenta.saldo > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(cuenta.saldo)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getEstadoColor(cuenta.estado)}`}>
                  {cuenta.estado.charAt(0).toUpperCase() + cuenta.estado.slice(1)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Orden:</span>
                <div className="font-medium">#{cuenta.fk_id_orden}</div>
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">Fechas</span>
            </div>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-gray-600">Creada:</span>
                <div className="font-medium">
                  {new Date(cuenta.creada_el).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de Pagos */}
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Resumen de Pagos</span>
            </div>
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Total Pagado:</span>
                <span className="font-bold text-green-700">
                  {formatCurrency(cuenta.total - cuenta.saldo)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Porcentaje Pagado:</span>
                <span className="font-bold text-green-700">
                  {((cuenta.total - cuenta.saldo) / cuenta.total * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Alerta si hay saldo pendiente */}
          {cuenta.saldo > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-800 text-sm">
                Esta cuenta tiene un saldo pendiente de {formatCurrency(cuenta.saldo)}
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 