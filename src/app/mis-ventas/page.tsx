"use client";

import React, { useEffect, useState } from "react";
import { getOrdenesVenta } from "@/services/ordenesVenta";
import { getOrdenesVentaDetalle } from "@/services/ordenesVentaDetalle";
import { getArticles } from "@/services/articles";
import { getClientes } from "@/services/clientes";
import { getOrdenesVentaMediosPago } from "@/services/ordenesVentaMediosPago";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IconReportAnalytics, IconSearch, IconUser, IconCalendar, IconArrowUpRight, IconArrowDownRight, IconTag } from "@tabler/icons-react";

const PAGE_SIZE = 15;

export default function MisVentasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ventas, setVentas] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientes, setClientes] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [, setArticulos] = useState<any[]>([]);
  const [filtros, setFiltros] = useState({ cliente: "", fechaDesde: "", fechaHasta: "", orden: "" });
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [clienteFocus, setClienteFocus] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [, setCuentasTesoreria] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [ordenes, articulosDB, clientesDB, cuentasTes] = await Promise.all([
        getOrdenesVenta(),
        getArticles(),
        getClientes(),
        getCuentasTesoreria(),
      ]);
      setCuentasTesoreria(cuentasTes);
      // Traer todos los detalles de todas las ordenes
      const detalles = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ordenes.map((orden: any) => getOrdenesVentaDetalle(orden.id))
      );
      
      // Debug: Ver qué datos se están obteniendo
      // console.log('Detalles obtenidos:', detalles);
      // detalles.forEach((detalleArray, idx) => {
      //   console.log(`Orden ${ordenes[idx].id} - Detalles:`, detalleArray);
      //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
      //   detalleArray.forEach((detalle: any) => {
      //     console.log(`  Detalle ${detalle.idd}: cantidad=${detalle.cantidad}, precio=${detalle.precio_unitario}`);
      //   });
      // });
      
      // Traer los medios de pago de todas las ordenes
      const mediosPago = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ordenes.map((orden: any) => getOrdenesVentaMediosPago(orden.id))
      );
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const ventasPlanas: any[] = ordenes.flatMap((orden: any, idx: number) => {
         // Calcular el total sin descuentos para obtener el factor de descuento
         const totalSinDescuento = detalles[idx].reduce((sum: number, det: any) => sum + (det.precio_unitario * det.cantidad), 0);
         const totalConDescuento = orden.total; // Este es el total real con descuentos aplicados
         const factorDescuento = totalSinDescuento > 0 ? totalConDescuento / totalSinDescuento : 1;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return detalles[idx].map((detalle: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const articulo = articulosDB.find((a: any) => a.id === detalle.fk_id_articulo);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cliente = clientesDB.find((c: any) => c.id === orden.fk_id_entidades);
          const costo = articulo?.precio_costo ?? 0;
          
          // Calcular precio final con descuentos aplicados
          const precioFinalConDescuento = detalle.precio_unitario * factorDescuento;
          const ganancia = (precioFinalConDescuento - costo) * detalle.cantidad;
          const rentabilidad = costo > 0 ? ((precioFinalConDescuento - costo) / costo) * 100 : null;
          
          // Debug: Ver qué cantidad se está procesando
          // console.log(`Procesando venta - Orden: ${orden.id}, Artículo: ${articulo?.descripcion}, Cantidad: ${detalle.cantidad}`);
          
          // Obtener cuentas de tesorería de la orden
          const cuentas = (mediosPago[idx] || []).map((mp: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cuenta = cuentasTes.find((ct: any) => ct.id === mp.fk_id_cuenta_tesoreria);
            return cuenta?.descripcion || "-";
          });
          return {
            orden: orden.id,
            fecha: orden.fecha?.slice(0, 10),
            cliente: cliente?.razon_social || "-",
            clienteObj: cliente,
            articulo: articulo?.descripcion || "-",
            precio_venta: precioFinalConDescuento,
            costo,
            cantidad: detalle.cantidad,
            ganancia,
            rentabilidad,
            cuentasTesoreria: cuentas,
          };
        });
      });
      setVentas(ventasPlanas);
      setClientes(clientesDB);
      setArticulos(articulosDB);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filtrar ventas
  const ventasFiltradas = ventas.filter((v) => {
    const matchCliente = !filtros.cliente || (v.clienteObj?.razon_social || "").toLowerCase().includes(filtros.cliente.toLowerCase());
    const matchOrden = !filtros.orden || String(v.orden).includes(filtros.orden);
    const matchDesde = !filtros.fechaDesde || v.fecha >= filtros.fechaDesde;
    const matchHasta = !filtros.fechaHasta || v.fecha <= filtros.fechaHasta;
    return matchCliente && matchOrden && matchDesde && matchHasta;
  });

  // Paginación
  const totalPaginas = Math.ceil(ventasFiltradas.length / PAGE_SIZE);
  const ventasPagina = ventasFiltradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  // Autocomplete clientes
  const clientesFiltrados = filtros.cliente.length > 0
    ? clientes.filter((c: any) => (c.razon_social || "").toLowerCase().includes(filtros.cliente.toLowerCase()))
    : [];

  return (
    <div className="p-8 max-w-full">
      <div className="flex items-center gap-3 mb-2">
        <IconReportAnalytics className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Mis ventas</h1>
      </div>
      <div className="text-gray-600 mb-8 text-lg">Análisis detallado de todas las ventas realizadas, artículos vendidos, márgenes y rentabilidad. Utiliza los filtros para encontrar información clave.</div>
      <div className="flex flex-wrap gap-4 mb-6 items-end bg-blue-50/50 p-4 rounded-lg shadow-sm">
        <div className="relative">
          <label className="block text-sm font-medium mb-1 flex items-center gap-1"><IconUser className="w-4 h-4 text-blue-400" />Cliente</label>
          <Input
            placeholder="Buscar cliente..."
            value={filtros.cliente}
            onChange={e => { setFiltros(f => ({ ...f, cliente: e.target.value })); setPagina(1); }}
            onFocus={() => setClienteFocus(true)}
            onBlur={() => setTimeout(() => setClienteFocus(false), 200)}
            className="min-w-[180px] pr-8"
            autoComplete="off"
          />
          {clienteFocus && clientesFiltrados.length > 0 && (
            <div className="absolute z-10 bg-white border rounded shadow w-full max-h-40 overflow-y-auto">
              {clientesFiltrados.slice(0, 10).map((c: any) => (
                <div
                  key={c.id}
                  className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm"
                  onMouseDown={() => { setFiltros(f => ({ ...f, cliente: c.razon_social })); setClienteFocus(false); }}
                >
                  {c.razon_social}
                </div>
              ))}
            </div>
          )}
          <IconSearch className="absolute right-2 top-8 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium mb-1 flex items-center gap-1"><IconTag className="w-4 h-4 text-blue-400" />N° Orden</label>
          <Input
            placeholder="Buscar orden..."
            value={filtros.orden}
            onChange={e => { setFiltros(f => ({ ...f, orden: e.target.value })); setPagina(1); }}
            className="min-w-[120px] pr-8"
          />
          <IconSearch className="absolute right-2 top-8 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium mb-1 flex items-center gap-1"><IconCalendar className="w-4 h-4 text-blue-400" />Fecha desde</label>
          <Input
            type="date"
            value={filtros.fechaDesde}
            onChange={e => { setFiltros(f => ({ ...f, fechaDesde: e.target.value })); setPagina(1); }}
            className="pr-8"
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium mb-1 flex items-center gap-1"><IconCalendar className="w-4 h-4 text-blue-400" />Fecha hasta</label>
          <Input
            type="date"
            value={filtros.fechaHasta}
            onChange={e => { setFiltros(f => ({ ...f, fechaHasta: e.target.value })); setPagina(1); }}
            className="pr-8"
          />
        </div>
        <Button onClick={() => setPagina(1)} variant="default" className="h-10 px-6">Buscar</Button>
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-xl overflow-x-auto">
        <Table className="min-w-[1100px]">
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead>N° Orden</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Artículo</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Cuenta Tesorería</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Precio Venta</TableHead>
              <TableHead>Ganancia</TableHead>
              <TableHead>Rentabilidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">Cargando...</TableCell>
              </TableRow>
            ) : ventasPagina.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">No se encontraron ventas</TableCell>
              </TableRow>
            ) : ventasPagina.map((v, idx) => (
              <TableRow key={idx} className={idx % 2 === 0 ? "bg-gray-50/50" : ""}>
                <TableCell className="font-mono text-xs">{v.orden}</TableCell>
                <TableCell className="text-xs">{v.fecha}</TableCell>
                <TableCell className="text-xs font-medium group relative">
                  {v.cliente}
                  {v.clienteObj?.email && (
                    <span className="absolute left-0 top-6 z-20 hidden group-hover:block bg-white border rounded shadow px-2 py-1 text-xs text-gray-700 min-w-[180px]">{v.clienteObj.email}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-medium group relative">
                  {v.articulo}
                </TableCell>
                <TableCell className="text-xs text-center">{v.cantidad}</TableCell>
                <TableCell className="text-xs font-semibold">
                  {v.cuentasTesoreria && v.cuentasTesoreria.length > 0 ? v.cuentasTesoreria.join(" y ") : "-"}
                </TableCell>
                <TableCell className="font-mono text-xs">${v.costo?.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">${v.precio_venta?.toLocaleString()}</TableCell>
                <TableCell className="text-xs font-semibold">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${v.ganancia >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {v.ganancia >= 0 ? <IconArrowUpRight className="w-4 h-4" /> : <IconArrowDownRight className="w-4 h-4" />}
                    ${v.ganancia?.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-semibold">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${v.rentabilidad >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {v.rentabilidad >= 0 ? <IconArrowUpRight className="w-4 h-4" /> : <IconArrowDownRight className="w-4 h-4" />}
                    {v.rentabilidad !== null ? v.rentabilidad.toFixed(2) + "%" : "-"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Paginación */}
        <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
          <div className="text-sm text-gray-600">
            Mostrando {ventasFiltradas.length === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1} a {Math.min(pagina * PAGE_SIZE, ventasFiltradas.length)} de {ventasFiltradas.length} registros
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>Anterior</Button>
            <span className="px-2">Página {pagina} de {totalPaginas}</span>
            <Button variant="outline" size="sm" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>Siguiente</Button>
          </div>
        </div>
      </div>
    </div>
  );
}