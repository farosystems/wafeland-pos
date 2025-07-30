import { useEffect, useState, useCallback } from "react";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from "@/app/actions/clientes";
import { Cliente, CreateClienteData } from "@/types/cliente";

export function useClientesSecure() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const addCliente = async (data: CreateClienteData) => {
    setLoading(true);
    setError(null);
    try {
      const newCliente = await createCliente(data);
      setClientes((prev) => [newCliente, ...prev]);
    } catch (error) {
      console.error("Error al crear cliente:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const editCliente = async (id: number, data: Partial<CreateClienteData>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateCliente(id, data);
      setClientes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
      );
    } catch (error) {
      console.error("Error al editar cliente:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const removeCliente = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return {
    clientes,
    loading,
    error,
    fetchClientes,
    addCliente,
    editCliente,
    removeCliente,
  };
} 