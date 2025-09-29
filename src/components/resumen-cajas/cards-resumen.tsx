"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumenPorTipo, ResumenGeneral } from "@/types/resumenCajas";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";

interface CardsResumenProps {
  resumenGeneral: ResumenGeneral;
  resumenPorTipos: ResumenPorTipo[];
  loading?: boolean;
}

export function CardsResumen({ resumenGeneral, resumenPorTipos, loading = false }: CardsResumenProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Cards de resumen general */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(resumenGeneral.total_ingresos)}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos los ingresos del período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(resumenGeneral.total_egresos)}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos los egresos del período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className={`h-4 w-4 ${resumenGeneral.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumenGeneral.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(resumenGeneral.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Diferencia entre ingresos y egresos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {resumenGeneral.cantidad_movimientos}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de transacciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards por tipo de movimiento */}
      {resumenPorTipos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Resumen por Tipo de Movimiento</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resumenPorTipos
              .sort((a, b) => Math.abs(b.total_monto) - Math.abs(a.total_monto))
              .map((tipo, index) => (
                <Card key={`${tipo.tipo_descripcion}-${index}`} className="relative overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-2">
                      {tipo.tipo_descripcion}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {tipo.tipo_movimiento === 'ingreso' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : tipo.tipo_movimiento === 'egreso' ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${
                      tipo.tipo_movimiento === 'ingreso' ? 'text-green-600' :
                      tipo.tipo_movimiento === 'egreso' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {formatCurrency(tipo.total_monto)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tipo.cantidad_movimientos} movimiento{tipo.cantidad_movimientos !== 1 ? 's' : ''}
                    </p>
                    {tipo.tipo_movimiento && (
                      <div className={`absolute top-0 right-0 w-1 h-full ${
                        tipo.tipo_movimiento === 'ingreso' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </>
  );
}