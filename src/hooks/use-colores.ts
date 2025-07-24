import * as React from "react";
import { Color, CreateColorData, UpdateColorData } from "@/types/color";
import { getColores, addColor, editColor, deleteColor } from "@/services/colores";

export function useColores() {
  const [colores, setColores] = React.useState<Color[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchColores = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getColores();
      setColores(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Error al cargar colores");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = async (color: CreateColorData) => {
    setLoading(true);
    try {
      await addColor(color);
      await fetchColores();
    } catch (e: any) {
      setError(e.message || "Error al agregar color");
    } finally {
      setLoading(false);
    }
  };

  const edit = async (id: number, color: UpdateColorData) => {
    setLoading(true);
    try {
      await editColor(id, color);
      await fetchColores();
    } catch (e: any) {
      setError(e.message || "Error al editar color");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    setLoading(true);
    try {
      await deleteColor(id);
      await fetchColores();
    } catch (e: any) {
      setError(e.message || "Error al eliminar color");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchColores();
  }, [fetchColores]);

  return {
    colores,
    error,
    loading,
    fetchColores,
    addColor: add,
    editColor: edit,
    deleteColor: remove,
  };
} 