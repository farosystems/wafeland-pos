import { useEffect, useState, useCallback } from "react";
import {
  getAgrupadores,
  createAgrupador,
  updateAgrupador,
  deleteAgrupador,
} from "@/services/agrupadores";
import { Agrupador, CreateAgrupadorData, UpdateAgrupadorData } from "@/types/agrupador";

export function useAgrupadores() {
  const [agrupadores, setAgrupadores] = useState<Agrupador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgrupadores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAgrupadores();
      setAgrupadores(data);
    } catch (error) {
      console.error("Error al cargar agrupadores:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgrupadores();
  }, [fetchAgrupadores]);

  const addAgrupador = async (data: CreateAgrupadorData) => {
    setLoading(true);
    setError(null);
    try {
      const newAgrupador = await createAgrupador(data);
      setAgrupadores((prev) => [newAgrupador, ...prev]);
    } catch (error) {
      console.error("Error al crear agrupador:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const editAgrupador = async (id: number, data: UpdateAgrupadorData) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateAgrupador(id, data);
      setAgrupadores((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updated } : a))
      );
    } catch (error) {
      console.error("Error al editar agrupador:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const removeAgrupador = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteAgrupador(id);
      setAgrupadores((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error al eliminar agrupador:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return {
    agrupadores,
    loading,
    error,
    fetchAgrupadores,
    addAgrupador,
    editAgrupador,
    removeAgrupador,
  };
} 