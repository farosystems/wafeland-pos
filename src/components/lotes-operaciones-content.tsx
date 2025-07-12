import React, { useEffect, useState } from "react";
import { getLotesOperaciones } from "@/services/lotesOperaciones";
import { LoteOperacion } from "@/types/loteOperacion";
import { FileText } from "lucide-react";
import { getCajas } from "@/services/cajas";
import { Caja } from "@/types/caja";
import { getUsuarios } from "@/services/usuarios";
import { Usuario } from "@/types/usuario";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

export function LotesOperacionesContent({ onImprimirCierre }: { onImprimirCierre?: (id_lote: number) => void }) {
  const [lotes, setLotes] = useState<LoteOperacion[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filtroLote, setFiltroLote] = useState("");
  const [filtroCaja, setFiltroCaja] = useState("");
  const pressClass = "active:scale-95 transition-transform duration-100 hover:scale-105 hover:shadow-lg";
  const [paginaActual, setPaginaActual] = useState(1);
  const LOTES_POR_PAGINA = 6;

  useEffect(() => {
    fetchLotes();
    getCajas().then(setCajas);
    getUsuarios().then(setUsuarios);
    // Escuchar evento de impresión
    const handler = (e: unknown) => {
      if (onImprimirCierre && (e as CustomEvent).detail?.id_lote) onImprimirCierre((e as CustomEvent).detail.id_lote);
    };
    window.addEventListener('imprimir-cierre-caja', handler);
    return () => window.removeEventListener('imprimir-cierre-caja', handler);
  }, []);

  async function fetchLotes() {
    setError(null);
    try {
      const data = await getLotesOperaciones();
      setLotes(data);
    } catch (error) {
      console.error("Error al cargar lotes de operaciones:", error);
      setError("Error al cargar lotes de operaciones");
    }
  }

  function getCajaNombreTurno(id: number) {
    const caja = cajas.find(c => c.id === id);
    return caja ? `${caja.descripcion} (${caja.turno})` : id;
  }

  function getUsuarioNombre(id: number) {
    const usuario = usuarios.find(u => u.id === id);
    return usuario ? usuario.nombre : id;
  }

  // Filtrado
  const lotesFiltrados = lotes.filter(lote => {
    const cajaNombreTurno = getCajaNombreTurno(lote.fk_id_caja).toString().toLowerCase();
    return (
      (filtroLote === "" || lote.id_lote.toString().includes(filtroLote)) &&
      (filtroCaja === "" || cajaNombreTurno.includes(filtroCaja.toLowerCase()))
    );
  });
  // Paginación
  const totalPaginas = Math.ceil(lotesFiltrados.length / LOTES_POR_PAGINA);
  const lotesPagina = lotesFiltrados.slice((paginaActual - 1) * LOTES_POR_PAGINA, paginaActual * LOTES_POR_PAGINA);

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
      <div className="rounded-md border bg-card w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Lote</TableHead>
              <TableHead>Caja</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Abierto</TableHead>
              <TableHead>Saldo Inicial</TableHead>
              <TableHead>Fecha Apertura</TableHead>
              <TableHead>Hora Apertura</TableHead>
              <TableHead>Fecha Cierre</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotesPagina.map((lote) => (
              <TableRow key={lote.id_lote}>
                <TableCell className="font-semibold">{lote.id_lote}</TableCell>
                <TableCell>{getCajaNombreTurno(lote.fk_id_caja)}</TableCell>
                <TableCell>{getUsuarioNombre(lote.fk_id_usuario)}</TableCell>
                <TableCell>{lote.tipo_lote}</TableCell>
                <TableCell>{lote.abierto ? "Sí" : "No"}</TableCell>
                <TableCell>${lote.saldo_inicial?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</TableCell>
                <TableCell>{lote.fecha_apertura?.slice(0, 10)}</TableCell>
                <TableCell>{lote.hora_apertura || 'N/A'}</TableCell>
                <TableCell>{lote.fecha_cierre?.slice(0, 10)}</TableCell>
                <TableCell>{lote.observaciones}</TableCell>
                <TableCell>
                  {!lote.abierto && (
                    <button title="Imprimir cierre de caja" className={pressClass} onClick={() => onImprimirCierre?.(lote.id_lote)}>
                      <FileText className="h-5 w-5" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {lotesPagina.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">No hay lotes registrados.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Paginación */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {lotesFiltrados.length === 0 ? (
              "0 de 0 filas."
            ) : (
              `${(paginaActual - 1) * LOTES_POR_PAGINA + 1} - ${Math.min(paginaActual * LOTES_POR_PAGINA, lotesFiltrados.length)} de ${lotesFiltrados.length} fila(s).`
            )}
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas || totalPaginas === 0}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 