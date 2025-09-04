import { useEffect, useState, useCallback } from "react";
import {
  getEstadoTablero,
  createMesa,
  updateMesa,
  deleteMesa,
  abrirMesa,
  cerrarMesa,
} from "@/app/actions/mesas";
import {
  EstadoMesaTablero,
  CreateMesaData,
  UpdateMesaData,
  CreateSesionMesaData,
} from "@/types/mesa";

export function useMesas() {
  const [estadoTablero, setEstadoTablero] = useState<EstadoMesaTablero[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstadoTablero = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEstadoTablero();
      setEstadoTablero(data);
    } catch (error) {
      console.error("Error al cargar estado del tablero:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstadoTablero();
  }, [fetchEstadoTablero]);

  const crearMesa = async (data: CreateMesaData) => {
    setLoading(true);
    setError(null);
    try {
      await createMesa(data);
      // Recargar el estado del tablero después de crear
      await fetchEstadoTablero();
    } catch (error) {
      console.error("Error al crear mesa:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const actualizarMesa = async (id: number, data: UpdateMesaData) => {
    setError(null);
    try {
      await updateMesa(id, data);
      // Actualizar solo la mesa específica en el estado local
      setEstadoTablero((prev) =>
        prev.map((estadoMesa) =>
          estadoMesa.mesa.id === id
            ? { ...estadoMesa, mesa: { ...estadoMesa.mesa, ...data } }
            : estadoMesa
        )
      );
    } catch (error) {
      console.error("Error al actualizar mesa:", error);
      setError((error as Error).message);
      throw error;
    }
  };

  const eliminarMesa = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteMesa(id);
      // Remover la mesa del estado local
      setEstadoTablero((prev) => prev.filter((estadoMesa) => estadoMesa.mesa.id !== id));
    } catch (error) {
      console.error("Error al eliminar mesa:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const abrirSesionMesa = async (data: CreateSesionMesaData) => {
    setLoading(true);
    setError(null);
    try {
      await abrirMesa(data);
      // Recargar el estado del tablero después de abrir sesión
      await fetchEstadoTablero();
    } catch (error) {
      console.error("Error al abrir sesión de mesa:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesionMesa = async (sesionId: number) => {
    setLoading(true);
    setError(null);
    try {
      await cerrarMesa(sesionId);
      // Recargar el estado del tablero después de cerrar sesión
      await fetchEstadoTablero();
    } catch (error) {
      console.error("Error al cerrar sesión de mesa:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener una mesa específica por ID
  const getMesaById = (mesaId: number) => {
    return estadoTablero.find((estadoMesa) => estadoMesa.mesa.id === mesaId);
  };

  // Función para obtener sesiones activas
  const getSesionesActivas = () => {
    return estadoTablero.filter((estadoMesa) => estadoMesa.sesion_activa);
  };

  // Función para obtener estadísticas rápidas
  const getEstadisticas = () => {
    const libres = estadoTablero.filter(m => m.estado === 'libre').length;
    const ocupadas = estadoTablero.filter(m => m.estado === 'ocupada').length;
    const porCobrar = estadoTablero.filter(m => m.estado === 'por_cobrar').length;
    const total = estadoTablero.length;

    return {
      libres,
      ocupadas,
      porCobrar,
      total,
    };
  };

  return {
    estadoTablero,
    loading,
    error,
    refetch: fetchEstadoTablero,
    crearMesa,
    actualizarMesa,
    eliminarMesa,
    abrirSesionMesa,
    cerrarSesionMesa,
    getMesaById,
    getSesionesActivas,
    getEstadisticas,
  };
}