import React, { useEffect, useState } from "react";
import { getLotesOperaciones } from "@/services/lotesOperaciones";
import { LoteOperacion } from "@/types/loteOperacion";
import { FileText } from "lucide-react";
import { getCajas } from "@/services/cajas";
import { Caja } from "@/types/caja";

export function LotesOperacionesContent({ onImprimirCierre }: { onImprimirCierre?: (id_lote: number) => void }) {
  const [lotes, setLotes] = useState<LoteOperacion[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroLote, setFiltroLote] = useState("");
  const [filtroCaja, setFiltroCaja] = useState("");
  const pressClass = "active:scale-95 transition-transform duration-100 hover:scale-105 hover:shadow-lg";

  useEffect(() => {
    fetchLotes();
    getCajas().then(setCajas);
    // Escuchar evento de impresión
    const handler = (e: any) => {
      if (onImprimirCierre && e.detail?.id_lote) onImprimirCierre(e.detail.id_lote);
    };
    window.addEventListener('imprimir-cierre-caja', handler);
    return () => window.removeEventListener('imprimir-cierre-caja', handler);
  }, []);

  async function fetchLotes() {
    setLoading(true); setError(null);
    try {
      const data = await getLotesOperaciones();
      setLotes(data);
    } catch (e: any) {
      setError("Error al cargar lotes de operaciones");
    }
    setLoading(false);
  }

  function getCajaNombreTurno(id: number) {
    const caja = cajas.find(c => c.id === id);
    return caja ? `${caja.descripcion} (${caja.turno})` : id;
  }

  const lotesFiltrados = lotes.filter(lote => {
    const cajaNombreTurno = getCajaNombreTurno(lote.fk_id_caja).toString().toLowerCase();
    return (
      (filtroLote === "" || lote.id_lote.toString().includes(filtroLote)) &&
      (filtroCaja === "" || cajaNombreTurno.includes(filtroCaja.toLowerCase()))
    );
  });

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Lotes de operaciones</h2>
      <div className="flex gap-4 mb-2">
        <input
          type="text"
          placeholder="Filtrar por ID Lote"
          value={filtroLote}
          onChange={e => setFiltroLote(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="text"
          placeholder="Filtrar por Caja"
          value={filtroCaja}
          onChange={e => setFiltroCaja(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="rounded-lg border bg-card p-4">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 text-left">ID Lote</th>
              <th className="px-2 py-1 text-left">Caja</th>
              <th className="px-2 py-1 text-left">Usuario</th>
              <th className="px-2 py-1 text-left">Tipo</th>
              <th className="px-2 py-1 text-left">Abierto</th>
              <th className="px-2 py-1 text-left">Saldo Inicial</th>
              <th className="px-2 py-1 text-left">Fecha Apertura</th>
              <th className="px-2 py-1 text-left">Fecha Cierre</th>
              <th className="px-2 py-1 text-left">Observaciones</th>
              <th className="px-2 py-1 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {lotesFiltrados.map((lote) => (
              <tr key={lote.id_lote} className="border-b">
                <td className="px-2 py-1 align-middle font-semibold">{lote.id_lote}</td>
                <td className="px-2 py-1 align-middle">{getCajaNombreTurno(lote.fk_id_caja)}</td>
                <td className="px-2 py-1 align-middle">{lote.fk_id_usuario}</td>
                <td className="px-2 py-1 align-middle">{lote.tipo_lote}</td>
                <td className="px-2 py-1 align-middle">{lote.abierto ? "Sí" : "No"}</td>
                <td className="px-2 py-1 align-middle">${lote.saldo_inicial?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                <td className="px-2 py-1 align-middle">{lote.fecha_apertura?.slice(0, 10)}</td>
                <td className="px-2 py-1 align-middle">{lote.fecha_cierre?.slice(0, 10)}</td>
                <td className="px-2 py-1 align-middle">{lote.observaciones}</td>
                <td className="px-2 py-1 align-middle">
                  {!lote.abierto && (
                    <button title="Imprimir cierre de caja" className={pressClass} onClick={() => onImprimirCierre?.(lote.id_lote)}>
                      <FileText className="h-5 w-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {lotesFiltrados.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-4 text-muted-foreground">No hay lotes registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 