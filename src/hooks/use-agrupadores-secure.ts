import { useState, useEffect } from 'react';
import { Agrupador, CreateAgrupadorData } from '@/types/agrupador';
import { 
  getAgrupadores, 
  createAgrupador, 
  updateAgrupador, 
  deleteAgrupador 
} from '@/app/actions/agrupadores';

export function useAgrupadoresSecure() {
  const [agrupadores, setAgrupadores] = useState<Agrupador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgrupadores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAgrupadores();
      setAgrupadores(data);
    } catch (err) {
      console.error("Error al cargar agrupadores:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const addAgrupador = async (agrupador: CreateAgrupadorData) => {
    try {
      setError(null);
      const newAgrupador = await createAgrupador(agrupador);
      setAgrupadores(prev => [newAgrupador, ...prev]);
      return newAgrupador;
    } catch (err) {
      console.error("Error al crear agrupador:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const editAgrupador = async (id: number, agrupador: Partial<CreateAgrupadorData>) => {
    try {
      setError(null);
      const updatedAgrupador = await updateAgrupador(id, agrupador);
      setAgrupadores(prev => 
        prev.map(a => a.id === id ? updatedAgrupador : a)
      );
      return updatedAgrupador;
    } catch (err) {
      console.error("Error al editar agrupador:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const removeAgrupador = async (id: number) => {
    try {
      setError(null);
      await deleteAgrupador(id);
      setAgrupadores(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Error al eliminar agrupador:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  useEffect(() => {
    fetchAgrupadores();
  }, []);

  return {
    agrupadores,
    loading,
    error,
    fetchAgrupadores,
    addAgrupador,
    editAgrupador,
    removeAgrupador
  };
} 