import { useState, useEffect } from 'react';
import { Color, CreateColorData } from '@/types/color';
import { 
  getColores, 
  createColor, 
  updateColor, 
  deleteColor 
} from '@/app/actions/colores';

export function useColoresSecure() {
  const [colores, setColores] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchColores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getColores();
      setColores(data);
    } catch (err) {
      console.error("Error al cargar colores:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const addColor = async (color: CreateColorData) => {
    try {
      setError(null);
      const newColor = await createColor(color);
      setColores(prev => [newColor, ...prev]);
      return newColor;
    } catch (err) {
      console.error("Error al crear color:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const editColor = async (id: number, color: Partial<CreateColorData>) => {
    try {
      setError(null);
      const updatedColor = await updateColor(id, color);
      setColores(prev => 
        prev.map(c => c.id === id ? updatedColor : c)
      );
      return updatedColor;
    } catch (err) {
      console.error("Error al editar color:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const removeColor = async (id: number) => {
    try {
      setError(null);
      await deleteColor(id);
      setColores(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error("Error al eliminar color:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  useEffect(() => {
    fetchColores();
  }, []);

  return {
    colores,
    loading,
    error,
    fetchColores,
    addColor,
    editColor,
    removeColor
  };
} 