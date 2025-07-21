"use client";
import React, { useEffect, useState, useMemo } from "react";
import { BreadcrumbBar } from "@/components/BreadcrumbBar";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getPagosCuentaCorriente } from "@/services/pagosCuentaCorriente";
import { getCuentasCorrientes } from "@/services/cuentasCorrientes";
import { getCuentasTesoreria } from "@/services/cuentasTesoreria";
import { getClientes } from "@/services/clientes";
import { PagoCuentaCorriente } from "@/services/pagosCuentaCorriente";
import { CuentaCorriente } from "@/types/cuentaCorriente";
import { CuentaTesoreria } from "@/types/cuentaTesoreria";
import { Cliente } from "@/types/cliente";
import { DetalleCuentaModal } from "@/components/cuentas-corrientes/detalle-cuenta-modal";

export default function PagosPage() {
  const [pagos, setPagos] = useState<PagoCuentaCorriente[]>([]);
  const [cuentasCorrientes, setCuentasCorrientes] = useState<CuentaCorriente[]>([]);
  const [cuentasTesoreria, setCuentasTesoreria] = useState<CuentaTesoreria[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [showDetalleCuenta, setShowDetalleCuenta] = useState<{ cuenta: CuentaCorriente; cliente: Cliente | null } | null>(null);
  const PAGOS_POR_PAGINA = 10;

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pagos, cuentasCorrientes, cuentasTesoreria, clientes] = await Promise.all([
        getPagosCuentaCorriente(),
        getCuentasCorrientes(),
        getCuentasTesoreria(),
        getClientes(),
      ]);
      setPagos(pagos);
      setCuentasCorrientes(cuentasCorrientes);
      setCuentasTesoreria(cuentasTesoreria);
      setClientes(clientes);
    } catch (e) {
      setError((e as Error).message || "Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const pagosFiltrados = useMemo(() => {
    if (!filtro.trim()) return pagos;
    const filtroLower = filtro.toLowerCase();
    return pagos.filter(p =>
      Object.values(p).some(v => String(v).toLowerCase().includes(filtroLower))
    );
  }, [pagos, filtro]);

  const pagosPagina = useMemo(() => {
    const totalPaginas = Math.ceil(pagosFiltrados.length / PAGOS_POR_PAGINA);
    const paginaValida = Math.min(paginaActual, totalPaginas);
    if (paginaValida !== paginaActual && totalPaginas > 0) {
      setPaginaActual(paginaValida);
    }
    return pagosFiltrados.slice((paginaValida - 1) * PAGOS_POR_PAGINA, paginaValida * PAGOS_POR_PAGINA);
  }, [pagosFiltrados, paginaActual]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(pagosFiltrados.length / PAGOS_POR_PAGINA);
  }, [pagosFiltrados]);

  return (
    <div className="w-full mt-6">
      <div className="flex flex-col items-start">
        <BreadcrumbBar />
      </div>
      <div className="w-full px-8 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <span className="text-3xl font-bold leading-tight">Pagos</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={loading} onClick={fetchAll}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refrescar"}
            </Button>
          </div>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Buscar pago..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="border rounded px-3 py-2 flex-1 max-w-xs"
            />
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 text-left">ID</th>
                <th className="px-2 py-1 text-left">Fecha</th>
                <th className="px-2 py-1 text-left">Cliente</th>
                <th className="px-2 py-1 text-left">Cuenta Corriente</th>
                <th className="px-2 py-1 text-left">Cuenta Tesorería</th>
                <th className="px-2 py-1 text-left">Monto</th>
              </tr>
            </thead>
            <tbody>
              {pagosPagina.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    {pagos.length === 0 ? "No hay pagos registrados." : "No se encontraron pagos con los filtros aplicados."}
                  </td>
                </tr>
              ) : (
                pagosPagina.map((pago) => {
                  const cuentaCorriente = cuentasCorrientes.find(cc => cc.id === pago.fk_id_cuenta_corriente);
                  const cliente = clientes.find(cl => cl.id === cuentaCorriente?.fk_id_cliente);
                  const cuentaTesoreria = cuentasTesoreria.find(ct => ct.id === pago.fk_id_cuenta_tesoreria);
                  
                  return (
                    <tr key={pago.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-2 py-3">{pago.id}</td>
                      <td className="px-2 py-3">{new Date(pago.creado_el).toLocaleString()}</td>
                      <td className="px-2 py-3">{cliente?.razon_social || 'N/A'}</td>
                      <td className="px-2 py-3">
                        {cuentaCorriente ? (
                          <button
                            onClick={() => setShowDetalleCuenta({ cuenta: cuentaCorriente, cliente: cliente || null })}
                            className="text-blue-600 underline hover:text-blue-800 transition-colors cursor-pointer font-medium"
                          >
                            #{cuentaCorriente.id}
                          </button>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-2 py-3">{cuentaTesoreria?.descripcion || 'N/A'}</td>
                      <td className="px-2 py-3 font-medium">{formatCurrency(pago.monto)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {/* Paginación */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {pagosFiltrados.length === 0 ? (
                "0 de 0 pagos."
              ) : (
                `${(paginaActual - 1) * PAGOS_POR_PAGINA + 1} - ${Math.min(paginaActual * PAGOS_POR_PAGINA, pagosFiltrados.length)} de ${pagosFiltrados.length} pago(s).`
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
        </div>

        {/* Modal de Detalle de Cuenta Corriente */}
        <DetalleCuentaModal
          cuenta={showDetalleCuenta?.cuenta || null}
          cliente={showDetalleCuenta?.cliente || null}
          isOpen={!!showDetalleCuenta}
          onClose={() => setShowDetalleCuenta(null)}
        />
      </div>
    </div>
  );
} 