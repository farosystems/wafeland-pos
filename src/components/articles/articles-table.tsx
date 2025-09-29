"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Edit, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Article } from "@/types/article";
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/utils";

interface ArticlesTableProps {
  data: Article[];
  onEdit?: (article: Article) => void;
  onNewArticle?: () => void;
}

export function ArticlesTable({ data, onEdit, onNewArticle }: ArticlesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns: ColumnDef<Article>[] = [
    {
      accessorKey: "id",
      header: "Código",
      cell: ({ row }) => <div>{row.getValue("id")}</div>,
    },
    {
      accessorKey: "descripcion",
      header: "Descripción",
      cell: ({ row }) => <div>{row.getValue("descripcion")}</div>,
    },
    {
      accessorKey: "es_combo",
      header: "Tipo",
      cell: ({ row }) => {
        const esCombo = row.getValue("es_combo") as boolean;
        return (
          <div className="flex items-center gap-2">
            {esCombo ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🧩 Combo
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                📦 Producto
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "precio_costo",
      header: "Precio Costo",
      cell: ({ row }) => {
        const costo = parseFloat(row.getValue("precio_costo"));
        return <div>{formatCurrency(costo, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</div>;
      },
    },
    {
      accessorKey: "mark_up",
      header: "Mark Up (%)",
      cell: ({ row }) => {
        const markup = parseFloat(row.getValue("mark_up"));
        return <div>{markup}%</div>;
      },
    },
    {
      accessorKey: "precio_unitario",
      header: "Precio Unitario",
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("precio_unitario"));
        return <div className="font-medium">{formatCurrency(price, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</div>;
      },
    },
    {
      accessorKey: "agrupador_nombre",
      header: "Agrupador",
      cell: ({ row }) => <div>{row.getValue("agrupador_nombre")}</div>,
    },
    {
      accessorKey: "componentes",
      header: "Componentes",
      cell: ({ row }) => {
        const esCombo = row.getValue("es_combo") as boolean;
        const componentes = row.original.componentes;

        // Debug logging
        if (esCombo) {
          console.log('🔍 Combo detectado:', {
            id: row.original.id,
            descripcion: row.original.descripcion,
            es_combo: esCombo,
            componentes: componentes,
            raw_data: row.original
          });
        }

        if (!esCombo) {
          return <div className="text-gray-400 text-sm">-</div>;
        }

        if (!componentes || componentes.length === 0) {
          return (
            <div className="text-orange-600 text-sm">
              Sin componentes
              <div className="text-xs text-gray-500">ID: {row.original.id}</div>
            </div>
          );
        }

        return (
          <div className="text-xs space-y-1 max-w-xs">
            {componentes.slice(0, 2).map((comp, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-blue-600">{comp.cantidad}x</span>
                <span className="truncate">{comp.articulo_componente?.descripcion || `ID: ${comp.fk_articulo_componente}`}</span>
              </div>
            ))}
            {componentes.length > 2 && (
              <div className="text-gray-500 text-xs">+{componentes.length - 2} más...</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "activo",
      header: "Activo",
      cell: ({ row }) => (
        <span className={row.getValue("activo") ? "text-green-600" : "text-red-600"}>
          {row.getValue("activo") ? "Sí" : "No"}
        </span>
      ),
    },
    // Nueva columna para stock
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.getValue("stock") as number;
        const esCombo = row.getValue("es_combo") as boolean;

        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${
              stock === 0 ? 'text-red-600' :
              stock < 5 ? 'text-orange-600' :
              'text-green-600'
            }`}>
              {stock}
            </span>
            {esCombo && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded" title="Stock calculado automáticamente">
                Auto
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "stock_minimo",
      header: "Stock Mínimo",
      cell: ({ row }) => <div>{row.getValue("stock_minimo")}</div>,
    },
    {
      accessorKey: "equivalencia",
      header: "Equivalencia",
      cell: ({ row }) => {
        const equivalencia = row.getValue("equivalencia") as number | null | undefined;
        return <div>{equivalencia !== null && equivalencia !== undefined ? equivalencia : "1.0"}</div>;
      },
    },
    {
      accessorKey: "marca_nombre",
      header: "Marca",
      cell: ({ row }) => <div>{row.getValue("marca_nombre") || "-"}</div>,
    },
    {
      accessorKey: "rentabilidad",
      header: "Rentabilidad (%)",
      cell: ({ row }) => {
        const precioUnitario = parseFloat(row.getValue("precio_unitario"));
        const precioCosto = parseFloat(row.getValue("precio_costo"));
        if (!precioCosto || isNaN(precioCosto) || precioCosto === 0) return "-";
        const rentabilidad = ((precioUnitario - precioCosto) / precioCosto) * 100;
        return <div>{rentabilidad.toFixed(2)}%</div>;
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => onEdit?.(row.original)}>
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        {/* Campos de filtro */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtrar por descripción..."
            value={(table.getColumn("descripcion")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("descripcion")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Input
            placeholder="Filtrar por agrupador..."
            value={(table.getColumn("agrupador_nombre")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("agrupador_nombre")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <select
            className="px-3 py-2 border rounded-md max-w-32"
            value={(table.getColumn("es_combo")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("es_combo")?.setFilterValue(event.target.value === "" ? undefined : event.target.value === "true")
            }
          >
            <option value="">Todos los tipos</option>
            <option value="false">Solo Productos</option>
            <option value="true">Solo Combos</option>
          </select>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {onNewArticle && (
            <Button onClick={onNewArticle}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo artículo
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columnas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-blue-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No se encontraron artículos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
} 