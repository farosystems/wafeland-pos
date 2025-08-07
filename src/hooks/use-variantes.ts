import * as React from "react";
import { Variante, CreateVarianteData, UpdateVarianteData } from "@/types/variante";
import { getVariantes, addVariante, editVariante, deleteVariante } from "@/services/variantes";

export function useVariantes() {
  const [variantes, setVariantes] = React.useState<Variante[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchVariantes = React.useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching variantes...');
      const data = await getVariantes();
      console.log('✅ Variantes fetched:', data.length);
      console.log('📋 Variantes con códigos de barras:', data.filter(v => v.codigo_barras).length);
      setVariantes(data);
      setError(null);
    } catch (e: any) {
      console.error('❌ Error fetching variantes:', e);
      setError(e.message || "Error al cargar variantes");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = async (variante: CreateVarianteData) => {
    setLoading(true);
    try {
      await addVariante(variante);
      await fetchVariantes();
    } catch (e: any) {
      setError(e.message || "Error al agregar variante");
    } finally {
      setLoading(false);
    }
  };

  const edit = async (id: number, variante: UpdateVarianteData) => {
    setLoading(true);
    try {
      await editVariante(id, variante);
      await fetchVariantes();
    } catch (e: any) {
      setError(e.message || "Error al editar variante");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    setLoading(true);
    try {
      await deleteVariante(id);
      await fetchVariantes();
    } catch (e: any) {
      setError(e.message || "Error al eliminar variante");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchVariantes();
  }, [fetchVariantes]);

  return {
    variantes,
    error,
    loading,
    fetchVariantes,
    addVariante: add,
    editVariante: edit,
    deleteVariante: remove,
  };
} 