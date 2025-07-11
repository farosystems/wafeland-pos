import React, { useEffect, useState } from "react";
import { getLotesOperaciones } from "@/services/lotesOperaciones";
import { LoteOperacion } from "@/types/loteOperacion";

export function LotesOperacionesContent() {
  const [lotes, setLotes] = useState<LoteOperacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLotes();
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

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Lotes de operaciones</h2>
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
              <th className="px-2 py-1 text-left">Fecha Apertura</th>
              <th className="px-2 py-1 text-left">Fecha Cierre</th>
              <th className="px-2 py-1 text-left">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <tr key={lote.id_lote} className="border-b">
                <td className="px-2 py-1 align-middle font-semibold">{lote.id_lote}</td>
                <td className="px-2 py-1 align-middle">{lote.fk_id_caja}</td>
                <td className="px-2 py-1 align-middle">{lote.fk_id_usuario}</td>
                <td className="px-2 py-1 align-middle">{lote.tipo_lote}</td>
                <td className="px-2 py-1 align-middle">{lote.abierto ? "Sí" : "No"}</td>
                <td className="px-2 py-1 align-middle">{lote.fecha_apertura?.slice(0, 10)}</td>
                <td className="px-2 py-1 align-middle">{lote.fecha_cierre?.slice(0, 10)}</td>
                <td className="px-2 py-1 align-middle">{lote.observaciones}</td>
              </tr>
            ))}
            {lotes.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted-foreground">No hay lotes registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 