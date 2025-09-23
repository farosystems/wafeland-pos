'use server'

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { Mesa, DetallePedidoMesa } from '@/types/mesa';
import { OrdenVenta, CreateOrdenVentaData } from '@/types/ordenVenta';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUserPermissions() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('No autorizado');
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, rol, email')
    .eq('clerk_user_id', userId)
    .single();

  if (!usuario) {
    throw new Error('Usuario no encontrado en el sistema');
  }

  return usuario;
}

interface ProcesarCobroData {
  sesionId: number;
  mesa: Mesa;
  detallePedidos: DetallePedidoMesa[];
  total: number;
  mediopagoId: number;
  tipoComprobanteId: number;
}

export async function procesarCobroMesa({
  sesionId,
  detallePedidos,
  total,
  mediopagoId,
  tipoComprobanteId,
}: Omit<ProcesarCobroData, 'mesa'>): Promise<OrdenVenta> {
  const usuario = await checkUserPermissions();

  if (usuario.rol !== 'admin' && usuario.rol !== 'supervisor' && usuario.rol !== 'cobrador') {
    throw new Error('No tienes permisos para procesar cobros');
  }

  // Iniciar transacción (simulada con try/catch)
  try {
    // 1. Obtener datos necesarios para la orden de venta
    
    // Obtener lote activo del usuario
    const { data: loteActivo, error: loteError } = await supabase
      .from('lotes_operaciones')
      .select('id_lote')
      .eq('fk_id_usuario', usuario.id)
      .eq('abierto', true)
      .single();

    if (loteError || !loteActivo) {
      throw new Error('No hay un lote de operaciones activo para procesar el cobro');
    }

    // Verificar que el tipo de comprobante seleccionado existe y está activo
    const { data: tipoComprobante, error: tipoError } = await supabase
      .from('tipos_comprobantes')
      .select('id, descripcion')
      .eq('id', tipoComprobanteId)
      .eq('activo', true)
      .single();

    if (tipoError || !tipoComprobante) {
      throw new Error('El tipo de comprobante seleccionado no es válido');
    }

    // Obtener entidad "CONSUMIDOR FINAL"
    const { data: entidadConsumidor, error: entidadError } = await supabase
      .from('entidades')
      .select('id')
      .eq('razon_social', 'CONSUMIDOR FINAL')
      .eq('tipo', 'cliente')
      .single();

    if (entidadError || !entidadConsumidor) {
      throw new Error('No se encontró la entidad "CONSUMIDOR FINAL"');
    }

    // 2. Crear orden de venta
    const ordenVentaData: CreateOrdenVentaData = {
      fk_id_entidades: entidadConsumidor.id,
      fk_id_usuario: usuario.id,
      fk_id_lote: loteActivo.id_lote,
      fk_id_tipo_comprobante: tipoComprobante.id,
      fecha: new Date().toISOString(),
      total: total,
      subtotal: total, // Por simplicidad, sin impuestos por ahora
    };

    const { data: ordenVenta, error: ordenError } = await supabase
      .from('ordenes_venta')
      .insert([ordenVentaData])
      .select()
      .single();

    if (ordenError || !ordenVenta) {
      throw new Error('Error al crear la orden de venta');
    }

    // 3. Crear detalles de la orden de venta
    const detallesOrden = detallePedidos.map(detalle => ({
      fk_id_orden: ordenVenta.id,
      fk_id_articulo: detalle.fk_id_articulo,
      cantidad: detalle.cantidad,
      precio_unitario: detalle.precio_unitario,
    }));

    const { error: detallesError } = await supabase
      .from('ordenes_venta_detalle')
      .insert(detallesOrden);

    if (detallesError) {
      throw new Error('Error al crear los detalles de la orden de venta');
    }

    // Procesar consumo de leche para cada detalle
    for (const detalle of detallesOrden) {
      try {
        // Obtener la equivalencia del artículo vendido
        const { data: articulo, error: articuloError } = await supabase
          .from("articulos")
          .select("equivalencia")
          .eq("id", detalle.fk_id_articulo)
          .single();

        if (!articuloError && articulo && articulo.equivalencia && articulo.equivalencia > 0) {
          // Llamar a la función SQL para procesar el consumo de leche
          const { error: consumoError } = await supabase.rpc('procesar_consumo_leche', {
            p_orden_id: detalle.fk_id_orden,
            p_articulo_id: detalle.fk_id_articulo,
            p_cantidad: detalle.cantidad,
            p_equivalencia_ml: articulo.equivalencia
          });

          if (consumoError) {
            console.error('Error al procesar consumo de leche:', consumoError);
            // No lanzamos error para que no falle la venta, solo logeamos
          }
        }
      } catch (error) {
        console.error('Error al verificar equivalencia para consumo de leche:', error);
        // No lanzamos error para que no falle la venta
      }
    }

    // 4. Crear medio de pago con el seleccionado
    // Verificar que existe la cuenta de tesorería seleccionada
    const { data: cuentaSeleccionada, error: cuentaError } = await supabase
      .from('cuentas_tesoreria')
      .select('id, descripcion')
      .eq('id', mediopagoId)
      .eq('activo', true)
      .single();

    if (cuentaError || !cuentaSeleccionada) {
      throw new Error('El medio de pago seleccionado no es válido');
    }

    const { error: mediosPagoError } = await supabase
      .from('ordenes_venta_medios_pago')
      .insert([{
        fk_id_orden: ordenVenta.id,
        fk_id_cuenta_tesoreria: cuentaSeleccionada.id,
        monto_pagado: total,
      }]);

    if (mediosPagoError) {
      throw new Error('Error al registrar el medio de pago');
    }

    // 5. Actualizar movimientos de stock (descontar)
    for (const detalle of detallePedidos) {
      // Obtener stock actual
      const { data: articulo, error: articuloError } = await supabase
        .from('articulos')
        .select('stock')
        .eq('id', detalle.fk_id_articulo)
        .single();

      if (articuloError || !articulo) {
        console.warn(`No se pudo obtener stock del artículo ${detalle.fk_id_articulo}`);
        continue;
      }

      const nuevoStock = articulo.stock - detalle.cantidad;

      // Actualizar stock
      await supabase
        .from('articulos')
        .update({ stock: Math.max(0, nuevoStock) })
        .eq('id', detalle.fk_id_articulo);

      // Registrar movimiento de stock
      await supabase
        .from('movimientos_stock')
        .insert([{
          fk_id_articulos: detalle.fk_id_articulo,
          fk_id_orden: ordenVenta.id,
          origen: 'venta_mesa',
          tipo: 'salida',
          cantidad: detalle.cantidad,
          stock_actual: Math.max(0, nuevoStock),
        }]);
    }

    // 6. Registrar ingreso en detalle_lotes_operaciones
    const { error: detalleLosteError } = await supabase
      .from('detalle_lotes_operaciones')
      .insert([{
        fk_id_lote: loteActivo.id_lote,
        fk_id_cuenta_tesoreria: cuentaSeleccionada.id,
        tipo: 'ingreso',
        monto: total,
        fecha_movimiento: new Date().toISOString(),
      }]);

    if (detalleLosteError) {
      throw new Error('Error al registrar el ingreso en detalle de lotes operaciones');
    }

    // 7. Cerrar sesión de mesa si no estaba ya cerrada
    const { error: cerrarSesionError } = await supabase
      .from('sesiones_mesa')
      .update({
        abierta: false,
        fecha_cierre: new Date().toISOString(),
        total_sesion: total,
      })
      .eq('id', sesionId);

    if (cerrarSesionError) {
      console.warn('Error al cerrar sesión de mesa:', cerrarSesionError);
    }

    return ordenVenta as OrdenVenta;

  } catch (error) {
    console.error('Error al procesar cobro de mesa:', error);
    throw error;
  }
}

// Función auxiliar para obtener datos de la orden de venta para el ticket
export async function getOrdenVentaCompleta(ordenId: number) {
  await checkUserPermissions();

  const { data: orden, error: ordenError } = await supabase
    .from('ordenes_venta')
    .select(`
      *,
      entidades!fk_id_entidades (razon_social),
      usuarios!fk_id_usuario (nombre),
      tipos_comprobantes!fk_id_tipo_comprobante (descripcion),
      ordenes_venta_detalle (
        *,
        articulos!fk_id_articulo (descripcion)
      ),
      ordenes_venta_medios_pago (
        *,
        cuentas_tesoreria!fk_id_cuenta_tesoreria (descripcion)
      )
    `)
    .eq('id', ordenId)
    .single();

  if (ordenError || !orden) {
    throw new Error('No se encontró la orden de venta');
  }

  return orden;
}