"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CardsResumen } from "@/components/resumen-cajas/cards-resumen";
import { TablaMovimientos } from "@/components/resumen-cajas/tabla-movimientos";
import {
  getMovimientosGastos,
  getResumenPorTipos,
  getResumenGeneral
} from "@/services/resumenCajas";
import {
  MovimientoGasto,
  ResumenPorTipo,
  ResumenGeneral,
  FiltrosFecha
} from "@/types/resumenCajas";

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4 pl-2">
      <span className="text-gray-600">Tesorería</span>
      <span className="mx-1 text-gray-400">&gt;</span>
      <span className="text-black font-medium">Resumen de Cajas</span>
    </nav>
  );
}

export default function ResumenCajasPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  const [movimientos, setMovimientos] = useState<MovimientoGasto[]>([]);
  const [resumenPorTipos, setResumenPorTipos] = useState<ResumenPorTipo[]>([]);
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneral>({
    total_ingresos: 0,
    total_egresos: 0,
    balance: 0,
    cantidad_movimientos: 0,
  });

  const [filtros, setFiltros] = useState<FiltrosFecha>({
    fecha_desde: "",
    fecha_hasta: "",
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (filtrosFecha?: FiltrosFecha) => {
    try {
      const filtrosToUse = filtrosFecha || filtros;
      const [movimientosData, resumenTiposData, resumenGeneralData] = await Promise.all([
        getMovimientosGastos(filtrosToUse),
        getResumenPorTipos(filtrosToUse),
        getResumenGeneral(filtrosToUse),
      ]);

      setMovimientos(movimientosData);
      setResumenPorTipos(resumenTiposData);
      setResumenGeneral(resumenGeneralData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos del resumen');
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      await fetchData();
      setLoading(false);
    }
    loadInitialData();
  }, []);

  const handleFiltrosChange = async (nuevosFiltros: FiltrosFecha) => {
    setFiltros(nuevosFiltros);
    setRefreshing(true);
    await fetchData(nuevosFiltros);
    setRefreshing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-muted-foreground gap-4">
        <span>Debes iniciar sesión para ver el resumen de cajas.</span>
        <Button onClick={() => router.push("/sign-in")}>Iniciar Sesión</Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Resumen de Cajas</h1>
            <p className="text-gray-500 text-base">
              Análisis completo de todos los movimientos de lotes de cajas del sistema
            </p>
          </div>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Cards de resumen */}
      <CardsResumen
        resumenGeneral={resumenGeneral}
        resumenPorTipos={resumenPorTipos}
        loading={loading}
      />

      {/* Tabla de movimientos */}
      <TablaMovimientos
        movimientos={movimientos}
        filtros={filtros}
        onFiltrosChange={handleFiltrosChange}
        loading={loading}
      />

    </div>
  );
}