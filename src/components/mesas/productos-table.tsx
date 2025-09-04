"use client";

import * as React from "react";
import { IconSearch, IconPlus, IconPackage, IconTag, IconBrandApple } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Article } from "@/types/article";
import { useAgrupadores } from "@/hooks/use-agrupadores";
import { useMarcas } from "@/hooks/use-marcas";

interface ProductosTableProps {
  productos: Article[];
  loading: boolean;
  onAgregarProducto: (producto: Article, cantidad: number) => void;
}

export function ProductosTable({ productos, loading, onAgregarProducto }: ProductosTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filtroAgrupador, setFiltroAgrupador] = React.useState<string>("");
  const [filtroMarca, setFiltroMarca] = React.useState<string>("");

  // Hooks para obtener agrupadores y marcas
  const { agrupadores } = useAgrupadores();
  const { marcas } = useMarcas();

  // Función para filtrar productos
  const productosFiltrados = React.useMemo(() => {
    return productos.filter(producto => {
      const matchesSearch = !searchTerm || 
        producto.id.toString().includes(searchTerm) ||
        producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAgrupador = !filtroAgrupador || 
        filtroAgrupador === "todos" ||
        producto.fk_id_agrupador.toString() === filtroAgrupador;
      
      const matchesMarca = !filtroMarca || 
        filtroMarca === "todas" ||
        (producto.fk_id_marca && producto.fk_id_marca.toString() === filtroMarca);

      return matchesSearch && matchesAgrupador && matchesMarca;
    });
  }, [productos, searchTerm, filtroAgrupador, filtroMarca]);

  const handleAgregarClick = (producto: Article) => {
    onAgregarProducto(producto, 1); // Por defecto agregar cantidad 1
  };

  const limpiarFiltros = () => {
    setSearchTerm("");
    setFiltroAgrupador("");
    setFiltroMarca("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <IconPackage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-muted-foreground">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel de filtros */}
      <div className="p-4 bg-gray-50 border-b space-y-4">
        <div className="flex gap-3 items-end">
          {/* Búsqueda por ID o nombre */}
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Buscar por ID o Nombre
            </label>
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por agrupador */}
          <div className="w-48">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Agrupador
            </label>
            <Select value={filtroAgrupador} onValueChange={setFiltroAgrupador}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los agrupadores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los agrupadores</SelectItem>
                {agrupadores.map((agrupador) => (
                  <SelectItem key={agrupador.id} value={agrupador.id.toString()}>
                    <div className="flex items-center gap-2">
                      <IconTag className="h-3 w-3" />
                      {agrupador.nombre}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por marca */}
          <div className="w-48">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Marca
            </label>
            <Select value={filtroMarca} onValueChange={setFiltroMarca}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las marcas</SelectItem>
                {marcas.map((marca) => (
                  <SelectItem key={marca.id} value={marca.id.toString()}>
                    <div className="flex items-center gap-2">
                      <IconBrandApple className="h-3 w-3" />
                      {marca.descripcion}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botón limpiar filtros */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={limpiarFiltros}
            disabled={!searchTerm && (!filtroAgrupador || filtroAgrupador === "todos") && (!filtroMarca || filtroMarca === "todas")}
          >
            Limpiar
          </Button>
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {productosFiltrados.length} de {productos.length} productos
          </span>
          {(searchTerm || (filtroAgrupador && filtroAgrupador !== "todos") || (filtroMarca && filtroMarca !== "todas")) && (
            <span className="text-blue-600">Filtros aplicados</span>
          )}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="w-32">Agrupador</TableHead>
              <TableHead className="w-32">Marca</TableHead>
              <TableHead className="w-24 text-right">Precio</TableHead>
              <TableHead className="w-20 text-center">Stock</TableHead>
              <TableHead className="w-20 text-center">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <IconPackage className="h-8 w-8 mb-2" />
                    <p className="text-sm">
                      {(searchTerm || (filtroAgrupador && filtroAgrupador !== "todos") || (filtroMarca && filtroMarca !== "todas"))
                        ? "No se encontraron productos con los filtros aplicados"
                        : "No hay productos disponibles"
                      }
                    </p>
                    {(searchTerm || (filtroAgrupador && filtroAgrupador !== "todos") || (filtroMarca && filtroMarca !== "todas")) && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={limpiarFiltros}
                        className="mt-1"
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              productosFiltrados.map((producto) => (
                <TableRow key={producto.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {producto.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{producto.descripcion}</div>
                    {producto.precio_costo && (
                      <div className="text-xs text-muted-foreground">
                        Costo: ${producto.precio_costo.toLocaleString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {producto.agrupador_nombre || 'Sin agrupador'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {producto.marca_nombre || 'Sin marca'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${producto.precio_unitario.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={producto.stock > producto.stock_minimo ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {producto.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      onClick={() => handleAgregarClick(producto)}
                      disabled={producto.stock <= 0}
                      className="gap-1"
                    >
                      <IconPlus className="h-3 w-3" />
                      <span className="sr-only">Agregar {producto.descripcion}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}