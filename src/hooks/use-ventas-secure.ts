import { useEffect, useState, useCallback } from "react";
import {
  getOrdenesVenta,
  createOrdenVenta,
  updateOrdenVenta,
  deleteOrdenVenta,
  createOrdenVentaDetalle,
  createOrdenVentaMedioPago,
} from "@/app/actions/ventas";
import { OrdenVenta, CreateOrdenVentaData } from "@/types/ordenVenta";

export function useVentasSecure() {
  const [ventas, setVentas] = useState<OrdenVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVentas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrdenesVenta();
      setVentas(data);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const addVenta = async (data: CreateOrdenVentaData) => {
    setLoading(true);
    setError(null);
    try {
      const newVenta = await createOrdenVenta(data);
      setVentas((prev) => [newVenta, ...prev]);
      return newVenta;
    } catch (error) {
      console.error("Error al crear venta:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const editVenta = async (id: number, data: Partial<CreateOrdenVentaData>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateOrdenVenta(id, data);
      setVentas((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updated } : v))
      );
      return updated;
    } catch (error) {
      console.error("Error al editar venta:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeVenta = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteOrdenVenta(id);
      setVentas((prev) => prev.filter((v) => v.id !== id));
    } catch (error) {
      console.error("Error al eliminar venta:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addDetalleVenta = async (detalle: {
    fk_id_orden: number;
    fk_id_articulo: number;
    cantidad: number;
    precio_unitario: number;
    fk_id_talle?: number | null;
    fk_id_color?: number | null;
  }) => {
    try {
      return await createOrdenVentaDetalle(detalle);
    } catch (error) {
      console.error("Error al crear detalle de venta:", error);
      throw error;
    }
  };

  const addMedioPago = async (medioPago: {
    fk_id_orden: number;
    fk_id_cuenta_tesoreria: number;
    monto: number;
  }) => {
    try {
      return await createOrdenVentaMedioPago(medioPago);
    } catch (error) {
      console.error("Error al crear medio de pago:", error);
      throw error;
    }
  };

  return {
    ventas,
    loading,
    error,
    fetchVentas,
    addVenta,
    editVenta,
    removeVenta,
    addDetalleVenta,
    addMedioPago,
  };
} 