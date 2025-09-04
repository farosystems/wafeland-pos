import { useEffect, useState, useCallback } from "react";
import {
  getPedidosDeSesion,
  getDetallePedido,
  addProductoAPedido,
  updateDetallePedido,
  removeProductoDePedido,
  createPedidoMesa,
  cerrarMesaParaCobro,
} from "@/app/actions/mesas";
import { getArticles } from "@/services/articles";
import { PedidoMesa, DetallePedidoMesa } from "@/types/mesa";
import { Article } from "@/types/article";

export function useMesaDetail(sesionId?: number) {
  const [pedidos, setPedidos] = useState<PedidoMesa[]>([]);
  const [detallePedidos, setDetallePedidos] = useState<DetallePedidoMesa[]>([]);
  const [productos, setProductos] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar pedidos de la sesión
  const fetchPedidos = useCallback(async () => {
    if (!sesionId) return;

    setLoading(true);
    setError(null);
    try {
      const pedidosData = await getPedidosDeSesion(sesionId);
      setPedidos(pedidosData);

      // Cargar detalles de todos los pedidos
      const todosLosDetalles: DetallePedidoMesa[] = [];
      for (const pedido of pedidosData) {
        const detalles = await getDetallePedido(pedido.id);
        todosLosDetalles.push(...detalles);
      }
      setDetallePedidos(todosLosDetalles);
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sesionId]);

  // Función para cargar productos disponibles
  const fetchProductos = useCallback(async () => {
    try {
      const productosData = await getArticles();
      setProductos(productosData.filter(p => p.activo));
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setError((error as Error).message);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (sesionId) {
      fetchPedidos();
      fetchProductos();
    }
  }, [sesionId, fetchPedidos, fetchProductos]);

  // Función para agregar producto al pedido
  const agregarProducto = async (producto: Article, cantidad: number) => {
    if (!sesionId) throw new Error("No hay sesión activa");

    setLoading(true);
    setError(null);
    try {
      // Obtener o crear pedido activo
      let pedidoActivo = pedidos.find(p => p.estado === 'pendiente');
      
      if (!pedidoActivo) {
        // Crear nuevo pedido
        pedidoActivo = await createPedidoMesa({
          fk_id_sesion_mesa: sesionId,
          numero_pedido: 1,
          observaciones: '',
        });
        setPedidos(prev => [...prev, pedidoActivo!]);
      }

      // Verificar si el producto ya está en el pedido
      const detalleExistente = detallePedidos.find(
        d => d.fk_id_pedido_mesa === pedidoActivo!.id && d.fk_id_articulo === producto.id
      );

      if (detalleExistente) {
        // Actualizar cantidad existente
        await actualizarCantidad(detalleExistente.id, detalleExistente.cantidad + cantidad);
      } else {
        // Agregar nuevo producto
        const nuevoDetalle = await addProductoAPedido({
          fk_id_pedido_mesa: pedidoActivo.id,
          fk_id_articulo: producto.id,
          cantidad,
          precio_unitario: producto.precio_unitario,
        });

        setDetallePedidos(prev => [...prev, {
          ...nuevoDetalle,
          articulo_descripcion: producto.descripcion,
        }]);
      }
    } catch (error) {
      console.error("Error al agregar producto:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar cantidad de un producto
  const actualizarCantidad = async (detalleId: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      await eliminarProducto(detalleId);
      return;
    }

    setError(null);
    try {
      await updateDetallePedido(detalleId, { cantidad: nuevaCantidad });
      
      setDetallePedidos(prev =>
        prev.map(detalle =>
          detalle.id === detalleId
            ? { 
                ...detalle, 
                cantidad: nuevaCantidad,
                subtotal: nuevaCantidad * detalle.precio_unitario
              }
            : detalle
        )
      );
    } catch (error) {
      console.error("Error al actualizar cantidad:", error);
      setError((error as Error).message);
      throw error;
    }
  };

  // Función para eliminar producto del pedido
  const eliminarProducto = async (detalleId: number) => {
    setError(null);
    try {
      await removeProductoDePedido(detalleId);
      setDetallePedidos(prev => prev.filter(detalle => detalle.id !== detalleId));
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      setError((error as Error).message);
      throw error;
    }
  };

  // Función para cerrar la mesa (marcarla como lista para cobro)
  const cerrarMesaFn = async () => {
    if (!sesionId) throw new Error("No hay sesión activa");

    setLoading(true);
    setError(null);
    try {
      await cerrarMesaParaCobro(sesionId);
    } catch (error) {
      console.error("Error al cerrar mesa:", error);
      setError((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Filtrar productos por búsqueda
  const filtrarProductos = useCallback((
    searchTerm: string,
    filtroAgrupador?: number,
    filtroMarca?: number
  ) => {
    return productos.filter(producto => {
      const matchesSearch = !searchTerm || 
        producto.id.toString().includes(searchTerm) ||
        producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAgrupador = !filtroAgrupador || 
        producto.fk_id_agrupador === filtroAgrupador;
      
      const matchesMarca = !filtroMarca || 
        producto.fk_id_marca === filtroMarca;

      return matchesSearch && matchesAgrupador && matchesMarca;
    });
  }, [productos]);

  return {
    pedidos,
    detallePedidos,
    productos,
    loading,
    error,
    refetchPedidos: fetchPedidos,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    cerrarMesa: cerrarMesaFn,
    filtrarProductos,
  };
}