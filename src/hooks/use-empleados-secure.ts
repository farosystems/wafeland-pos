import { useState, useEffect } from 'react';
import { Empleado, CreateEmpleadoData } from '@/types/empleado';
import { 
  getEmpleados, 
  createEmpleado, 
  updateEmpleado, 
  deleteEmpleado 
} from '@/app/actions/empleados';

export function useEmpleadosSecure() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmpleados();
      setEmpleados(data);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const addEmpleado = async (empleado: CreateEmpleadoData) => {
    try {
      setError(null);
      const newEmpleado = await createEmpleado(empleado);
      setEmpleados(prev => [newEmpleado, ...prev]);
      return newEmpleado;
    } catch (err) {
      console.error("Error al crear empleado:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const editEmpleado = async (id: number, empleado: Partial<CreateEmpleadoData>) => {
    try {
      setError(null);
      const updatedEmpleado = await updateEmpleado(id, empleado);
      setEmpleados(prev => 
        prev.map(e => e.id === id ? updatedEmpleado : e)
      );
      return updatedEmpleado;
    } catch (err) {
      console.error("Error al editar empleado:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  const removeEmpleado = async (id: number) => {
    try {
      setError(null);
      await deleteEmpleado(id);
      setEmpleados(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error("Error al eliminar empleado:", err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    }
  };

  useEffect(() => {
    fetchEmpleados();
  }, []);

  return {
    empleados,
    loading,
    error,
    fetchEmpleados,
    addEmpleado,
    editEmpleado,
    removeEmpleado
  };
} 