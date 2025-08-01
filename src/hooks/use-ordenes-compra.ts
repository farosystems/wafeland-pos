import * as React from "react";
import { OrdenCompra, CreateOrdenCompraData, UpdateOrdenCompraData } from "@/types/ordenCompra";
import { getOrdenesCompra, createOrdenCompra, editOrdenCompra, deleteOrdenCompra, getProveedores, getConfiguracionEmpresa } from "@/services/ordenesCompra";

export function useOrdenesCompra() {
  const [ordenes, setOrdenes] = React.useState<OrdenCompra[]>([]);
  const [proveedores, setProveedores] = React.useState<any[]>([]);
  const [configEmpresa, setConfigEmpresa] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchOrdenes = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdenesCompra();
      setOrdenes(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Error al cargar órdenes de compra");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProveedores = React.useCallback(async () => {
    try {
      const data = await getProveedores();
      setProveedores(data);
    } catch (e: any) {
      console.error("Error al cargar proveedores:", e);
    }
  }, []);

  const fetchConfigEmpresa = React.useCallback(async () => {
    try {
      const data = await getConfiguracionEmpresa();
      setConfigEmpresa(data);
    } catch (e: any) {
      console.error("Error al cargar configuración de empresa:", e);
    }
  }, []);

  const add = async (orden: CreateOrdenCompraData) => {
    setLoading(true);
    try {
      await createOrdenCompra(orden);
      await fetchOrdenes();
    } catch (e: any) {
      setError(e.message || "Error al crear orden de compra");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const edit = async (id: number, orden: UpdateOrdenCompraData) => {
    setLoading(true);
    try {
      await editOrdenCompra(id, orden);
      await fetchOrdenes();
    } catch (e: any) {
      setError(e.message || "Error al editar orden de compra");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    setLoading(true);
    try {
      await deleteOrdenCompra(id);
      await fetchOrdenes();
    } catch (e: any) {
      setError(e.message || "Error al eliminar orden de compra");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrdenes();
    fetchProveedores();
    fetchConfigEmpresa();
  }, [fetchOrdenes, fetchProveedores, fetchConfigEmpresa]);

  return {
    ordenes,
    proveedores,
    configEmpresa,
    error,
    loading,
    fetchOrdenes,
    addOrdenCompra: add,
    editOrdenCompra: edit,
    deleteOrdenCompra: remove,
  };
} 