import { useState, useEffect } from 'react';
import { Marca, CreateMarcaData } from '@/types/marca';
import { 
  getMarcas, 
  createMarca, 
  updateMarca, 
  deleteMarca 
} from '@/app/actions/marcas';

export function useMarcasSecure() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarcas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMarcas();
      setMarcas(data);
    } catch (err) {
      console.error("Error al cargar marcas:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const addMarca = async (marca: CreateMarcaData) => {
    try {
      setError(null);
      const newMarca = await createMarca(marca);
      setMarcas(prev => [newMarca, ...prev]);
      return newMarca;
    } catch (err) {
      console.error("Error al crear marca:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const editMarca = async (id: number, marca: Partial<CreateMarcaData>) => {
    try {
      setError(null);
      const updatedMarca = await updateMarca(id, marca);
      setMarcas(prev => 
        prev.map(m => m.id === id ? updatedMarca : m)
      );
      return updatedMarca;
    } catch (err) {
      console.error("Error al editar marca:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const removeMarca = async (id: number) => {
    try {
      setError(null);
      await deleteMarca(id);
      setMarcas(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Error al eliminar marca:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  useEffect(() => {
    fetchMarcas();
  }, []);

  return {
    marcas,
    loading,
    error,
    fetchMarcas,
    addMarca,
    editMarca,
    removeMarca
  };
} 