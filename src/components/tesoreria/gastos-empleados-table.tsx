"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Eye, User, CreditCard, Calendar, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getEmpleados } from "@/services/empleados";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { useState } from "react";
import { getTiposGasto } from "@/services/tiposGasto";
import { getUsuarios } from "@/services/usuarios";
import { TipoGasto } from "@/types/tipoGasto";
import { Usuario } from "@/types/usuario";
import { GastoEmpleado } from "@/types/gastoEmpleado";

interface GastosEmpleadosTableProps {
  data: GastoEmpleado[];
}

const PAGE_SIZE = 10;

export function GastosEmpleadosTable({ data }: GastosEmpleadosTableProps) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [tipoMovimientoFilter, setTipoMovimientoFilter] = React.useState<string>("todos");
  const [columnVisibility, setColumnVisibility] = React.useState({
    id: true,
    fecha: true,
    tipo: true,
    tipoMovimiento: true,
    monto: true,
    descripcion: true,
    empleado: true,
    lote: true,
    usuario: true,
    cuentaTesoreria: true,
    acciones: true,
  });
  const [selectedGasto, setSelectedGasto] = React.useState<GastoEmpleado | null>(null);
  const [empleados, setEmpleados] = React.useState<{ id: number; nombre: string; apellido: string }[]>([]);
  const [cuentas, setCuentas] = React.useState<{ id: number; descripcion: string }[]>([]);
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  React.useEffect(() => {
    async function fetchData() {
      setEmpleados(await getEmpleados());
      setCuentas(await getCuentasTesoreria());
      setTiposGasto(await getTiposGasto());
      setUsuarios(await getUsuarios());
    }
    fetchData();
  }, []);

  const getEmpleadoNombre = (id: number | null) => {
    const emp = empleados.find(e => e.id === id);
    return emp ? `${emp.nombre} ${emp.apellido}` : id ?? "-";
  };
  const getCuentaDescripcion = (id: number | null) => {
    const cta = cuentas.find(c => c.id === id);
    return cta ? cta.descripcion : id ?? "-";
  };

  const getTipoMovimiento = (fkTipoGasto: number | null) => {
    const tipo = tiposGasto.find(t => t.id === fkTipoGasto);
    return tipo?.tipo_movimiento || null;
  };

  // Filtro de búsqueda (por descripción, tipo o empleado) y por tipo de movimiento
  const filtered = data.filter(gasto => {
    // Filtro por texto de búsqueda
    const matchesSearch = (gasto.descripcion?.toLowerCase().includes(search.toLowerCase()) || "") ||
      (tiposGasto.find(t => t.id === gasto.fk_tipo_gasto)?.descripcion?.toLowerCase().includes(search.toLowerCase()) || "") ||
      (gasto.fk_empleado?.toString().includes(search) || "");

    // Filtro por tipo de movimiento (por nombre del tipo)
    const matchesTipoMovimiento =
      tipoMovimientoFilter === "todos" ||
      (tipoMovimientoFilter === String(gasto.fk_tipo_gasto));

    return matchesSearch && matchesTipoMovimiento;
  });

  // Paginación
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="w-full mt-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Buscar movimiento..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Select
            value={tipoMovimientoFilter}
            onValueChange={(value) => {
              setTipoMovimientoFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span>Todos los tipos</span>
                </div>
              </SelectItem>
              {tiposGasto.map((tipo) => (
                <SelectItem key={tipo.id} value={String(tipo.id)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      tipo.tipo_movimiento === 'ingreso' ? 'bg-green-500' :
                      tipo.tipo_movimiento === 'egreso' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`}></div>
                    <span>{tipo.descripcion || "Sin descripción"}</span>
                    {tipo.tipo_movimiento && (
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        tipo.tipo_movimiento === 'ingreso'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {tipo.tipo_movimiento === 'ingreso' ? '↗️' : '↙️'}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-2">
                Columnas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(columnVisibility).map(([col, visible]) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visible}
                  onCheckedChange={v => setColumnVisibility(cv => ({ ...cv, [col]: v }))}
                  className="capitalize"
                >
                  {col === "id" ? "ID" :
                   col === "fecha" ? "Fecha" :
                   col === "tipo" ? "Tipo" :
                   col === "tipoMovimiento" ? "Movimiento" :
                   col === "monto" ? "Monto" :
                   col === "descripcion" ? "Descripción" :
                   col === "empleado" ? "Empleado" :
                   col === "lote" ? "Lote" :
                   col === "usuario" ? "Usuario" :
                   col === "cuentaTesoreria" ? "Cuenta Tesorería" :
                   col === "acciones" ? "Acciones" : col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Indicador de filtros activos */}
        {(search || tipoMovimientoFilter !== "todos") && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-sm text-blue-700 font-medium">Filtros activos:</span>
            {search && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Búsqueda: &quot;{search}&quot;
              </span>
            )}
            {tipoMovimientoFilter !== "todos" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Tipo: {tiposGasto.find(t => t.id === parseInt(tipoMovimientoFilter))?.descripcion || "Desconocido"}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-blue-600 hover:text-blue-800"
              onClick={() => {
                setSearch("");
                setTipoMovimientoFilter("todos");
                setPage(1);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              {columnVisibility.id && <th className="px-2 py-1 text-left">ID</th>}
              {columnVisibility.fecha && <th className="px-2 py-1 text-left">Fecha</th>}
              {columnVisibility.tipo && <th className="px-2 py-1 text-left">Tipo</th>}
              {columnVisibility.tipoMovimiento && <th className="px-2 py-1 text-left">Movimiento</th>}
              {columnVisibility.monto && <th className="px-2 py-1 text-left">Monto</th>}
              {columnVisibility.descripcion && <th className="px-2 py-1 text-left">Descripción</th>}
              {columnVisibility.empleado && <th className="px-2 py-1 text-left">Empleado</th>}
              {columnVisibility.lote && <th className="px-2 py-1 text-left">Lote</th>}
              {columnVisibility.usuario && <th className="px-2 py-1 text-left">Usuario</th>}
              {columnVisibility.cuentaTesoreria && <th className="px-2 py-1 text-left">Cuenta Tesorería</th>}
              {columnVisibility.acciones && <th className="px-2 py-1 text-left">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-muted-foreground">
                  {data.length === 0 ? "No hay movimientos registrados." : "No se encontraron movimientos con los filtros aplicados."}
                </td>
              </tr>
            ) : (
              paginated.map((gasto) => {
                const tipoMovimiento = getTipoMovimiento(gasto.fk_tipo_gasto);
                return (
                  <tr key={gasto.id} className="border-b hover:bg-blue-50 transition-colors">
                    {columnVisibility.id && <td className="px-2 py-1 text-left">{gasto.id}</td>}
                    {columnVisibility.fecha && <td className="px-2 py-1">{gasto.creado_el ? new Date(gasto.creado_el).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : ""}</td>}
                    {columnVisibility.tipo && <td className="px-2 py-1">{tiposGasto.find(t => t.id === gasto.fk_tipo_gasto)?.descripcion || "-"}</td>}
                    {columnVisibility.tipoMovimiento && (
                      <td className="px-2 py-1">
                        {tipoMovimiento ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              tipoMovimiento === 'ingreso' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              tipoMovimiento === 'ingreso'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {tipoMovimiento === 'ingreso' ? '↗️ Ingreso' : '↙️ Egreso'}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            ➖ Sin definir
                          </span>
                        )}
                      </td>
                    )}
                    {columnVisibility.monto && <td className="px-2 py-1">{gasto.monto != null ? formatCurrency(gasto.monto, "ARS", "es-AR") : ""}</td>}
                    {columnVisibility.descripcion && <td className="px-2 py-1">{gasto.descripcion}</td>}
                    {columnVisibility.empleado && <td className="px-2 py-1">{getEmpleadoNombre(gasto.fk_empleado)}</td>}
                    {columnVisibility.lote && <td className="px-2 py-1">{gasto.fk_lote_operaciones}</td>}
                    {columnVisibility.usuario && <td className="px-2 py-1">{usuarios.find(u => u.id === gasto.fk_usuario)?.nombre || gasto.fk_usuario}</td>}
                    {columnVisibility.cuentaTesoreria && <td className="px-2 py-1">{getCuentaDescripcion(gasto.fk_cuenta_tesoreria)}</td>}
                    {columnVisibility.acciones && <td className="px-2 py-1">
                      <Button size="icon" variant="outline" onClick={() => setSelectedGasto(gasto)} title="Ver gasto">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {filtered.length === 0 ? (
              "0 de 0 movimientos."
            ) : (
              `${(page - 1) * PAGE_SIZE + 1} - ${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length} movimiento(s).`
            )}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
      <Dialog open={!!selectedGasto} onOpenChange={v => !v && setSelectedGasto(null)}>
        <DialogContent className="max-w-md" preventOutsideClose>
          <DialogHeader>
            <DialogTitle className="text-blue-700 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Movimiento #{selectedGasto?.id}
            </DialogTitle>
            <DialogDescription className="mb-2 text-gray-500">Detalle completo del movimiento seleccionado.</DialogDescription>
          </DialogHeader>
          {selectedGasto && (
            <div className="space-y-4">
              {/* Empleado */}
              <div className="rounded-lg bg-blue-50 p-3 flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-700">Empleado</div>
                  <div className="text-gray-900">{getEmpleadoNombre(selectedGasto.fk_empleado)}</div>
                </div>
              </div>
              {/* Detalles del gasto */}
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  Detalles del Movimiento
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Tipo</span>
                  <span className="font-semibold text-blue-700 capitalize">{tiposGasto.find(t => t.id === selectedGasto.fk_tipo_gasto)?.descripcion || "-"}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Movimiento</span>
                  <div>
                    {(() => {
                      const tipoMovimiento = getTipoMovimiento(selectedGasto.fk_tipo_gasto);
                      return tipoMovimiento ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            tipoMovimiento === 'ingreso' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tipoMovimiento === 'ingreso'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tipoMovimiento === 'ingreso' ? '↗️ Ingreso' : '↙️ Egreso'}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          ➖ Sin definir
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Monto</span>
                  <span className="font-bold text-green-700">{selectedGasto.monto != null ? formatCurrency(selectedGasto.monto, "ARS", "es-AR") : ""}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Cuenta Tesorería</span>
                  <span className="text-gray-900">{getCuentaDescripcion(selectedGasto.fk_cuenta_tesoreria)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Lote</span>
                  <span className="text-gray-900">{selectedGasto.fk_lote_operaciones}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Usuario</span>
                  <span className="text-gray-900">{usuarios.find(u => u.id === selectedGasto.fk_usuario)?.nombre || selectedGasto.fk_usuario}</span>
                </div>
              </div>
              {/* Fechas */}
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Fechas
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha de creación</span>
                  <span className="text-gray-900">{selectedGasto.creado_el ? new Date(selectedGasto.creado_el).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : ""}</span>
                </div>
              </div>
              {/* Descripción */}
              <div className="rounded-lg bg-green-50 p-3">
                <div className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  Descripción
                </div>
                <div className="text-gray-900">{selectedGasto.descripcion || <span className="italic text-gray-400">Sin descripción</span>}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 