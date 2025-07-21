"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { IconCash } from "@tabler/icons-react";
import { getCuentasCorrientes, cancelarCuentaCorriente } from "@/services/cuentasCorrientes";
import { getClientes } from "@/services/clientes";
import { Cliente } from "@/types/cliente";
import { CuentaCorriente } from "@/types/cuentaCorriente";
import { X, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { PagoModal } from "@/components/cuentas-corrientes/pago-modal";

export default function CuentasCorrientesPage() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [showDetalle, setShowDetalle] = useState<CuentaCorriente | null>(null);
  const [showPagoModal, setShowPagoModal] = useState<CuentaCorriente | null>(null);
  const CUENTAS_POR_PAGINA = 10;
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showCancelError, setShowCancelError] = useState(false);
  const [cancelErrorMsg, setCancelErrorMsg] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState<{ open: boolean, cuenta: CuentaCorriente | null }>({ open: false, cuenta: null });
  const [showPagoCanceladoError, setShowPagoCanceladoError] = useState(false);

  const columns = [
    { key: "id", label: "ID" },
    { key: "creada_el", label: "Fecha" },
    { key: "fk_id_orden", label: "Orden" },
    { key: "fk_id_cliente", label: "Cliente" },
    { key: "total", label: "Total" },
    { key: "saldo", label: "Saldo" },
    { key: "estado", label: "Estado" },
    { key: "acciones", label: "Acciones" },
  ];
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const fetchAll = async () => {
    setError(null);
    try {
      const [cuentas, clientes] = await Promise.all([
        getCuentasCorrientes(),
        getClientes(),
      ]);
      setCuentas(cuentas);
      setClientes(clientes);
    } catch (e) {
      setError((e as Error).message || "Error al cargar cuentas corrientes");
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const cuentasFiltradas = useMemo(() => {
    if (!filtro.trim()) return cuentas;
    const filtroLower = filtro.toLowerCase();
    return cuentas.filter(c =>
      Object.values(c).some(v => String(v).toLowerCase().includes(filtroLower))
    );
  }, [cuentas, filtro]);

  const cuentasPagina = useMemo(() => {
    const totalPaginas = Math.ceil(cuentasFiltradas.length / CUENTAS_POR_PAGINA);
    const paginaValida = Math.min(paginaActual, totalPaginas);
    if (paginaValida !== paginaActual && totalPaginas > 0) {
      setPaginaActual(paginaValida);
    }
    return cuentasFiltradas.slice((paginaValida - 1) * CUENTAS_POR_PAGINA, paginaValida * CUENTAS_POR_PAGINA);
  }, [cuentasFiltradas, paginaActual]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(cuentasFiltradas.length / CUENTAS_POR_PAGINA);
  }, [cuentasFiltradas]);

  return (
    <div className="w-full mt-6">
      <div className="flex flex-col items-start">
        <BreadcrumbBar />
        <div className="flex items-center gap-3 mb-6 pl-6">
          <IconCash className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold leading-tight">Cuentas Corrientes</span>
        </div>
      </div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center py-4">
          <input
            type="text"
            placeholder="Buscar cuenta..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            className="border rounded px-3 py-2 flex-1 max-w-xs mr-2"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columnas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  className="capitalize"
                  checked={columnVisibility[col.key] !== false}
                  onCheckedChange={val => setColumnVisibility(v => ({ ...v, [col.key]: !!val }))}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              {columns.map(col => (columnVisibility[col.key] ?? true) && (
                <TableHead key={col.key} className="font-bold">{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cuentasPagina.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {cuentas.length === 0 ? "No hay cuentas corrientes registradas." : "No se encontraron cuentas con los filtros aplicados."}
                </TableCell>
              </TableRow>
            ) : (
              cuentasPagina.map((cuenta) => (
                <TableRow key={cuenta.id} className="border-b hover:bg-gray-50 transition-colors">
                  {(columnVisibility["id"] ?? true) && <TableCell>{cuenta.id}</TableCell>}
                  {(columnVisibility["creada_el"] ?? true) && <TableCell>{new Date(cuenta.creada_el).toLocaleString()}</TableCell>}
                  {(columnVisibility["fk_id_orden"] ?? true) && <TableCell>{cuenta.fk_id_orden}</TableCell>}
                  {(columnVisibility["fk_id_cliente"] ?? true) && <TableCell>{clientes.find(cl => cl.id === cuenta.fk_id_cliente)?.razon_social || cuenta.fk_id_cliente}</TableCell>}
                  {(columnVisibility["total"] ?? true) && <TableCell>{formatCurrency(cuenta.total)}</TableCell>}
                  {(columnVisibility["saldo"] ?? true) && <TableCell>{formatCurrency(cuenta.saldo)}</TableCell>}
                  {(columnVisibility["estado"] ?? true) && <TableCell>
                    <span className={
                      cuenta.estado === "pendiente"
                        ? "inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold"
                        : cuenta.estado === "pagada"
                        ? "inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold"
                        : "inline-block px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-semibold"
                    }>
                      {cuenta.estado.charAt(0).toUpperCase() + cuenta.estado.slice(1)}
                    </span>
                  </TableCell>}
                  {(columnVisibility["acciones"] ?? true) && <TableCell className="flex gap-2 items-center">
                    <button
                      title="Efectuar pago"
                      onClick={() => {
                        if (cuenta.estado === "cancelado") {
                          setShowPagoCanceladoError(true);
                        } else {
                          setShowPagoModal(cuenta);
                        }
                      }}
                      disabled={cuenta.estado === "cancelado"}
                      className="border bg-white shadow-sm hover:bg-gray-100 text-black rounded-lg p-2 transition-colors cursor-pointer"
                      style={{ outline: 'none' }}
                    >
                      <DollarSign className="h-5 w-5" />
                    </button>
                    {cuenta.estado !== "cancelado" && (
                      <button
                        title="Cancelar cuenta"
                        onClick={() => {
                          if (cuenta.estado === "pagada") {
                            setCancelErrorMsg("No se puede cancelar una cuenta corriente que ya está pagada.");
                            setShowCancelError(true);
                          } else {
                            setShowCancelConfirm({ open: true, cuenta });
                          }
                        }}
                        className="border bg-white shadow-sm hover:bg-gray-100 text-black rounded-lg p-2 transition-colors cursor-pointer"
                        style={{ outline: 'none' }}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* Paginación */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {cuentasFiltradas.length === 0 ? (
              "0 de 0 cuentas."
            ) : (
              `${(paginaActual - 1) * CUENTAS_POR_PAGINA + 1} - ${Math.min(paginaActual * CUENTAS_POR_PAGINA, cuentasFiltradas.length)} de ${cuentasFiltradas.length} cuenta(s).`
            )}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
            >
              Siguiente
            </button>
          </div>
        </div>
        {/* Popup de detalle */}
        <Dialog open={!!showDetalle} onOpenChange={() => setShowDetalle(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalle de Cuenta Corriente</DialogTitle>
            </DialogHeader>
            {showDetalle && (
              <div className="text-sm">
                <table className="min-w-full border">
                  <tbody>
                    {Object.entries(showDetalle).map(([k, v]) => (
                      <tr key={k}>
                        <td className="px-2 py-1 font-bold bg-gray-100 text-left whitespace-nowrap">{k}</td>
                        <td className="px-2 py-1 text-left">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Pago */}
        <PagoModal
          cuenta={showPagoModal}
          isOpen={!!showPagoModal}
          onClose={() => setShowPagoModal(null)}
          onPagoRealizado={() => {
            fetchAll();
            setShowPagoModal(null);
          }}
        />

        {/* Popup de error al cancelar cuenta pagada */}
        <Dialog open={showCancelError} onOpenChange={setShowCancelError}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Error</DialogTitle>
            </DialogHeader>
            <div className="text-red-600 mb-4">{cancelErrorMsg}</div>
            <div className="flex justify-end">
              <Button onClick={() => setShowCancelError(false)}>Aceptar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Popup de confirmación de cancelación */}
        <Dialog open={showCancelConfirm.open} onOpenChange={open => setShowCancelConfirm(s => ({ ...s, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar cancelación</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea cancelar la cuenta corriente #{showCancelConfirm.cuenta?.id}?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" onClick={() => setShowCancelConfirm({ open: false, cuenta: null })}>No, volver</Button>
              <Button variant="destructive" onClick={async () => {
                if (showCancelConfirm.cuenta) {
                  await cancelarCuentaCorriente(showCancelConfirm.cuenta.id);
                  setShowCancelConfirm({ open: false, cuenta: null });
                  fetchAll();
                }
              }}>Sí, cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Popup de error al intentar pagar una cuenta cancelada */}
        <Dialog open={showPagoCanceladoError} onOpenChange={setShowPagoCanceladoError}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No se puede efectuar pago</DialogTitle>
              <DialogDescription>
                No se puede realizar un pago sobre una cuenta corriente que está cancelada.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end mt-4">
              <Button onClick={() => setShowPagoCanceladoError(false)}>Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 