import * as React from "react";
import { Marca, CreateMarcaData, UpdateMarcaData } from "@/types/marca";
import { getMarcas, addMarca, editMarca, deleteMarca } from "@/services/marcas";

export function useMarcas() {
  const [marcas, setMarcas] = React.useState<Marca[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchMarcas = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarcas();
      setMarcas(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Error al cargar marcas");
    } finally {
      setLoading(false);
    }
  }, []);

  const add = async (marca: CreateMarcaData) => {
    setLoading(true);
    try {
      await addMarca(marca);
      await fetchMarcas();
    } catch (e: any) {
      setError(e.message || "Error al agregar marca");
    } finally {
      setLoading(false);
    }
  };

  const edit = async (id: number, marca: UpdateMarcaData) => {
    setLoading(true);
    try {
      await editMarca(id, marca);
      await fetchMarcas();
    } catch (e: any) {
      setError(e.message || "Error al editar marca");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    setLoading(true);
    try {
      await deleteMarca(id);
      await fetchMarcas();
    } catch (e: any) {
      setError(e.message || "Error al eliminar marca");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMarcas();
  }, [fetchMarcas]);

  return {
    marcas,
    error,
    loading,
    fetchMarcas,
    addMarca: add,
    editMarca: edit,
    deleteMarca: remove,
  };
} 