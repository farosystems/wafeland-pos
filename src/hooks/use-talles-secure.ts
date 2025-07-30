import { useState, useEffect } from 'react';
import { Talle, CreateTalleData } from '@/types/talle';
import { 
  getTalles, 
  createTalle, 
  updateTalle, 
  deleteTalle 
} from '@/app/actions/talles';

export function useTallesSecure() {
  const [talles, setTalles] = useState<Talle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTalles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTalles();
      setTalles(data);
    } catch (err) {
      console.error("Error al cargar talles:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const addTalle = async (talle: CreateTalleData) => {
    try {
      setError(null);
      const newTalle = await createTalle(talle);
      setTalles(prev => [newTalle, ...prev]);
      return newTalle;
    } catch (err) {
      console.error("Error al crear talle:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const editTalle = async (id: number, talle: Partial<CreateTalleData>) => {
    try {
      setError(null);
      const updatedTalle = await updateTalle(id, talle);
      setTalles(prev => 
        prev.map(t => t.id === id ? updatedTalle : t)
      );
      return updatedTalle;
    } catch (err) {
      console.error("Error al editar talle:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const removeTalle = async (id: number) => {
    try {
      setError(null);
      await deleteTalle(id);
      setTalles(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error al eliminar talle:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  useEffect(() => {
    fetchTalles();
  }, []);

  return {
    talles,
    loading,
    error,
    fetchTalles,
    addTalle,
    editTalle,
    removeTalle
  };
} 