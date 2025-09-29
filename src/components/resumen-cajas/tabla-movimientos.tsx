"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { MovimientoGasto, FiltrosFecha } from "@/types/resumenCajas";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TablaMovimientosProps {
  movimientos: MovimientoGasto[];
  filtros: FiltrosFecha;
  onFiltrosChange: (filtros: FiltrosFecha) => void;
  loading?: boolean;
}

const PAGE_SIZE = 15;

export function TablaMovimientos({ movimientos, filtros, onFiltrosChange, loading = false }: TablaMovimientosProps) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [tipoFilter, setTipoFilter] = React.useState<string>("todos");

  // Aplicar filtros locales
  const filteredMovimientos = movimientos.filter(mov => {
    const matchesSearch =
      mov.tipo_gasto?.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      mov.cuenta_tesoreria?.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      mov.lote?.caja?.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      mov.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      mov.empleado?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      mov.empleado?.apellido?.toLowerCase().includes(search.toLowerCase()) ||
      mov.monto.toString().includes(search);

    const matchesTipo =
      tipoFilter === "todos" ||
      (tipoFilter === "ingreso" && mov.tipo_gasto?.tipo_movimiento === "ingreso") ||
      (tipoFilter === "egreso" && mov.tipo_gasto?.tipo_movimiento === "egreso");

    return matchesSearch && matchesTipo;
  });

  // Paginación
  const total = filteredMovimientos.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginatedMovimientos = filteredMovimientos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFechaChange = (campo: keyof FiltrosFecha, valor: string) => {
    onFiltrosChange({
      ...filtros,
      [campo]: valor
    });
    setPage(1);
  };

  const limpiarFiltrosFecha = () => {
    onFiltrosChange({
      fecha_desde: "",
      fecha_hasta: ""
    });
    setPage(1);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Movimientos de Cajas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Movimientos de Cajas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros de fecha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha desde</label>
            <Input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => handleFechaChange('fecha_desde', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha hasta</label>
            <Input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => handleFechaChange('fecha_hasta', e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={limpiarFiltrosFecha}
              disabled={!filtros.fecha_desde && !filtros.fecha_hasta}
            >
              Limpiar fechas
            </Button>
          </div>
        </div>

        {/* Filtros de búsqueda */}
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Buscar por tipo, cuenta, caja, empleado o monto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />

          <select
            value={tipoFilter}
            onChange={(e) => {
              setTipoFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-md"
          >
            <option value="todos">Todos los tipos</option>
            <option value="ingreso">Solo Ingresos</option>
            <option value="egreso">Solo Egresos</option>
          </select>
        </div>

        {/* Indicadores de filtros activos */}
        {(search || tipoFilter !== "todos" || filtros.fecha_desde || filtros.fecha_hasta) && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Filtros activos:</span>
            {search && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Búsqueda: &quot;{search}&quot;
              </span>
            )}
            {tipoFilter !== "todos" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Tipo: {tipoFilter === "ingreso" ? "Ingresos" : "Egresos"}
              </span>
            )}
            {(filtros.fecha_desde || filtros.fecha_hasta) && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Fechas: {filtros.fecha_desde || "..."} → {filtros.fecha_hasta || "..."}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-blue-600 hover:text-blue-800"
              onClick={() => {
                setSearch("");
                setTipoFilter("todos");
                limpiarFiltrosFecha();
              }}
            >
              Limpiar todo
            </Button>
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-md border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Movimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Movimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cuenta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caja
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lote
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron movimientos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedMovimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(mov.creado_el), "dd/MM/yyyy HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {mov.tipo_gasto?.tipo_movimiento === 'ingreso' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : mov.tipo_gasto?.tipo_movimiento === 'egreso' ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          mov.tipo_gasto?.tipo_movimiento === 'ingreso'
                            ? 'bg-green-100 text-green-800'
                            : mov.tipo_gasto?.tipo_movimiento === 'egreso'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {mov.tipo_gasto?.tipo_movimiento === 'ingreso' ? 'Ingreso' :
                           mov.tipo_gasto?.tipo_movimiento === 'egreso' ? 'Egreso' : 'Sin definir'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{mov.tipo_gasto?.descripcion || '-'}</div>
                        {mov.descripcion && (
                          <div className="text-xs text-gray-500 truncate max-w-32">
                            {mov.descripcion}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {mov.empleado ? `${mov.empleado.nombre} ${mov.empleado.apellido}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {mov.cuenta_tesoreria?.descripcion || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{mov.lote?.caja?.descripcion || '-'}</div>
                        {mov.lote?.caja?.turno && (
                          <div className="text-xs text-gray-500">
                            Turno: {mov.lote.caja.turno}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      #{mov.fk_lote_operaciones}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${
                        mov.tipo_gasto?.tipo_movimiento === 'ingreso' ? 'text-green-600' :
                        mov.tipo_gasto?.tipo_movimiento === 'egreso' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {mov.tipo_gasto?.tipo_movimiento === 'ingreso' ? '+' :
                         mov.tipo_gasto?.tipo_movimiento === 'egreso' ? '-' : ''}{formatCurrency(mov.monto)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Mostrando {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, total)} de {total} movimientos
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}