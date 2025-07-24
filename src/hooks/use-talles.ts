import * as React from "react";
import { Talle, CreateTalleData, UpdateTalleData } from "@/types/talle";
import { getTalles, addTalle, editTalle, deleteTalle } from "@/services/talles";

export function useTalles() {
  const [talles, setTalles] = React.useState<Talle[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchTalles = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTalles();
      setTalles(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Error al cargar talles");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = async (talle: CreateTalleData) => {
    setLoading(true);
    try {
      await addTalle(talle);
      await fetchTalles();
    } catch (e: any) {
      setError(e.message || "Error al agregar talle");
    } finally {
      setLoading(false);
    }
  };

  const edit = async (id: number, talle: UpdateTalleData) => {
    setLoading(true);
    try {
      await editTalle(id, talle);
      await fetchTalles();
    } catch (e: any) {
      setError(e.message || "Error al editar talle");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    setLoading(true);
    try {
      await deleteTalle(id);
      await fetchTalles();
    } catch (e: any) {
      setError(e.message || "Error al eliminar talle");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTalles();
  }, [fetchTalles]);

  return {
    talles,
    error,
    loading,
    fetchTalles,
    addTalle: add,
    editTalle: edit,
    deleteTalle: remove,
  };
} 