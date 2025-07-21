import React, { useEffect, useState, useMemo, useCallback } from "react";
import { getLotesOperaciones } from "@/services/lotesOperaciones";
import { LoteOperacion } from "@/types/loteOperacion";
import { FileText, Loader2 } from "lucide-react";
import { getCajas } from "@/services/cajas";
import { Caja } from "@/types/caja";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { formatCurrency, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/utils";

const CACHE_KEY = 'lotes_operaciones_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function saveCache(data: LoteOperacion[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
}
function loadCache(): LoteOperacion[] | null {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
    return null;
  } catch {
    return null;
  }
}

export function LotesOperacionesContent({ onImprimirCierre }: { onImprimirCierre?: (id_lote: number) => void }) {
  const [lotes, setLotes] = useState<LoteOperacion[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroLote, setFiltroLote] = useState("");
  const [filtroCaja, setFiltroCaja] = useState("");
  const pressClass = "active:scale-95 transition-transform duration-100 hover:scale-105 hover:shadow-lg";
  const [paginaActual, setPaginaActual] = useState(1);
  const LOTES_POR_PAGINA = 6;

  // Memoizar funciones de búsqueda para evitar re-renderizados
  const getCajaNombre = useCallback((id: number) => {
    const caja = cajas.find(c => c.id === id);
    return caja ? caja.descripcion : id;
  }, [cajas]);

  // Memoizar datos filtrados para evitar recálculos innecesarios
  const lotesFiltrados = useMemo(() => {
    return lotes.filter(lote => {
      const cajaNombre = getCajaNombre(lote.fk_id_caja).toString().toLowerCase();
      return (
        (filtroLote === "" || lote.id_lote.toString().includes(filtroLote)) &&
        (filtroCaja === "" || cajaNombre.includes(filtroCaja.toLowerCase()))
      );
    });
  }, [lotes, filtroLote, filtroCaja, getCajaNombre]);

  // Memoizar datos paginados
  const lotesPagina = useMemo(() => {
    const totalPaginas = Math.ceil(lotesFiltrados.length / LOTES_POR_PAGINA);
    // Si no hay resultados o la página actual es mayor que el total, resetear a 1
    if (paginaActual > totalPaginas || totalPaginas === 0) {
      if (paginaActual !== 1) setPaginaActual(1);
      return lotesFiltrados.slice(0, LOTES_POR_PAGINA);
    }
    return lotesFiltrados.slice((paginaActual - 1) * LOTES_POR_PAGINA, paginaActual * LOTES_POR_PAGINA);
  }, [lotesFiltrados, paginaActual]);

  const totalPaginas = useMemo(() => {
    return Math.ceil(lotesFiltrados.length / LOTES_POR_PAGINA);
  }, [lotesFiltrados]);

  // Cargar lotes con caché local
  const fetchLotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Intentar leer del caché
    const cached = loadCache();
    if (cached) {
      setLotes(cached);
      setLoading(false);
      // También refrescar en background
      getLotesOperaciones().then(data => {
        setLotes(data);
        saveCache(data);
      });
      return;
    }
    // Si no hay caché, fetch normal
    try {
      const data = await getLotesOperaciones();
      setLotes(data);
      saveCache(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  useEffect(() => {
    getCajas().then(setCajas);
  }, []);

  // Cuando se refrescan los lotes desde el padre (por ejemplo, después de cerrar caja), limpiar y recargar caché
  useEffect(() => {
    const handler = () => {
      localStorage.removeItem(CACHE_KEY);
      fetchLotes();
    };
    window.addEventListener('refreshLotesOperaciones', handler);
    return () => window.removeEventListener('refreshLotesOperaciones', handler);
  }, [fetchLotes]);

  // Función para refrescar datos
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLotesOperaciones();
      setLotes(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Lotes de operaciones</h2>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando lotes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Lotes de operaciones</h2>
        <button
          onClick={refreshData}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refrescar"}
        </button>
      </div>
      
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
              <TableHead>Hora Cierre</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lotesPagina.map((lote) => (
              <TableRow key={lote.id_lote} className="hover:bg-gray-50 transition-colors">
                <TableCell className="font-semibold">{lote.id_lote}</TableCell>
                <TableCell>{getCajaNombre(lote.fk_id_caja)}</TableCell>
                <TableCell>{lote.fk_id_usuario ? lote.fk_id_usuario : ''}</TableCell>
                <TableCell>{lote.tipo_lote}</TableCell>
                <TableCell>{lote.abierto ? "Sí" : "No"}</TableCell>
                <TableCell>{formatCurrency(lote.saldo_inicial || 0, DEFAULT_CURRENCY, DEFAULT_LOCALE)}</TableCell>
                <TableCell>{lote.fecha_apertura?.slice(0, 10)}</TableCell>
                <TableCell>{lote.hora_apertura ? lote.hora_apertura.slice(0,5) : ''}</TableCell>
                <TableCell>{lote.fecha_cierre?.slice(0, 10)}</TableCell>
                <TableCell>{lote.hora_cierre ? lote.hora_cierre.slice(0,5) : ''}</TableCell>
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
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  {lotes.length === 0 ? "No hay lotes registrados." : "No se encontraron lotes con los filtros aplicados."}
                </TableCell>
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
    </div>
  );
} 