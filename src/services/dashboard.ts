import { supabase } from "@/lib/supabaseClient";

// Tipos para los datos del dashboard
export interface DashboardData {
  totalVentas: number;
  totalClientes: number;
  totalProductos: number;
  ventasPorPeriodo: Array<{
    mes: string;
    ventas: number;
    meta: number;
  }>;
  rankingMediosPago: Array<{
    tipo: string;
    ventas: number;
    color: string;
    posicion: number;
  }>;
  rankingProductos: Array<{
    producto: string;
    ventas: number;
    stock: number;
    color: string;
  }>;
  metricasDiarias: Array<{
    dia: string;
    ventas: number;
    clientes: number;
    productos: number;
  }>;
  rendimientoVendedores: Array<{
    vendedor: string;
    ventas: number;
    meta: number;
    color: string;
  }>;
  alertas: Array<{
    tipo: 'warning' | 'success' | 'info';
    titulo: string;
    mensaje: string;
  }>;
}

export async function getDashboardData(periodo: string = 'mes'): Promise<DashboardData> {
  try {
    // Calcular fechas de filtro según el período
    const { fechaInicio, fechaFin } = calcularFechasPeriodo(periodo);
    
    // console.log('Período seleccionado:', periodo);
    // console.log('Fecha inicio filtro:', fechaInicio.toISOString());
    // console.log('Fecha fin filtro:', fechaFin.toISOString());
    
    // Obtener datos básicos sin joins problemáticos
    const [clientesData, ventasData, articulosData, mediosPagoData, detallesVentaData, cuentasTesoreriaData] = await Promise.all([
      supabase.from("entidades").select("*"),
      supabase.from("ordenes_venta")
        .select("*")
        .gte('fecha', fechaInicio.toISOString())
        .lte('fecha', fechaFin.toISOString()),
      supabase.from("articulos").select("*"),
      supabase.from("ordenes_venta_medios_pago").select("*"),
      supabase.from("ordenes_venta_detalle").select("*"),
      supabase.from("cuentas_tesoreria").select("*").eq("activo", true)
    ]);

    // Verificar errores individualmente
    if (clientesData.error) {
      console.error('Error obteniendo clientes:', clientesData.error);
      throw new Error(`Error obteniendo clientes: ${clientesData.error.message}`);
    }
    if (ventasData.error) {
      console.error('Error obteniendo ventas:', ventasData.error);
      throw new Error(`Error obteniendo ventas: ${ventasData.error.message}`);
    }
    if (articulosData.error) {
      console.error('Error obteniendo artículos:', articulosData.error);
      throw new Error(`Error obteniendo artículos: ${articulosData.error.message}`);
    }
    if (mediosPagoData.error) {
      console.error('Error obteniendo medios de pago:', mediosPagoData.error);
      throw new Error(`Error obteniendo medios de pago: ${mediosPagoData.error.message}`);
    }
    if (detallesVentaData.error) {
      console.error('Error obteniendo detalles de ventas:', detallesVentaData.error);
      throw new Error(`Error obteniendo detalles de ventas: ${detallesVentaData.error.message}`);
    }
    if (cuentasTesoreriaData.error) {
      console.error('Error obteniendo cuentas de tesorería:', cuentasTesoreriaData.error);
      throw new Error(`Error obteniendo cuentas de tesorería: ${cuentasTesoreriaData.error.message}`);
    }

    const clientes = clientesData.data || [];
    const ventas = ventasData.data || [];
    const articulos = articulosData.data || [];
    const mediosPago = mediosPagoData.data || [];
    const detallesVenta = detallesVentaData.data || [];
    const cuentasTesoreria = cuentasTesoreriaData.data || [];

    // Log para debug
    // console.log('Datos obtenidos:', {
    //   clientes: clientes.length,
    //   ventas: ventas.length,
    //   articulos: articulos.length,
    //   mediosPago: mediosPago.length,
    //   detallesVenta: detallesVenta.length,
    //   cuentasTesoreria: cuentasTesoreria.length
    // });

    // Debug específico para medios de pago
    // console.log('Medios de pago obtenidos:', mediosPago);
    // console.log('Cuentas de tesorería obtenidas:', cuentasTesoreria);

    // Calcular totales
    const totalVentas = ventas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const totalClientes = clientes.length;
    const totalProductos = articulos.length;

    // Si no hay datos, retornar valores por defecto
    if (ventas.length === 0 && clientes.length === 0 && articulos.length === 0) {
      // console.log('No hay datos en la base de datos, retornando valores por defecto');
      return {
        totalVentas: 0,
        totalClientes: 0,
        totalProductos: 0,
        ventasPorPeriodo: [],
        rankingMediosPago: [],
        rankingProductos: [],
        metricasDiarias: [],
        rendimientoVendedores: [],
        alertas: []
      };
    }

    // Ventas por período (dinámico según período seleccionado)
    const ventasPorPeriodo = calcularVentasPorPeriodo(ventas, periodo);

    // Ventas por tipo de pago
    const rankingMediosPago = calcularVentasPorTipoPago(mediosPago, cuentasTesoreria, ventas);

    // Ranking de productos
    const rankingProductos = calcularRankingProductos(detallesVenta, articulos, ventas);

    // Métricas diarias (última semana)
    const metricasDiarias = calcularMetricasDiarias(ventas);

    // Rendimiento de vendedores (simulado por ahora)
    const rendimientoVendedores = calcularRendimientoVendedores();

    // Alertas del sistema
    const alertas = generarAlertas(articulos, ventas, clientes);

    return {
      totalVentas,
      totalClientes,
      totalProductos,
      ventasPorPeriodo,
      rankingMediosPago,
      rankingProductos,
      metricasDiarias,
      rendimientoVendedores,
      alertas
    };
  } catch (error) {
    console.error('Error obteniendo datos del dashboard:', error);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularVentasPorPeriodo(ventas: any[], periodo: string): Array<{mes: string, ventas: number, meta: number}> {
  const { fechaInicio, fechaFin } = calcularFechasPeriodo(periodo);
  
  if (ventas.length === 0) {
    // Si no hay ventas, retornar datos por defecto según el período
    return generarPeriodosVacios(periodo);
  }
  
  // Filtrar ventas por el período seleccionado
  const ventasFiltradas = ventas.filter(venta => {
    if (!venta.fecha) return false;
    try {
      const fecha = new Date(venta.fecha);
      return fecha >= fechaInicio && fecha <= fechaFin;
    } catch (error) {
      console.warn('Error procesando fecha de venta:', venta.fecha, error);
      return false;
    }
  });
  
  // Calcular ventas por período según el tipo
  switch (periodo) {
    case 'semana':
      return calcularVentasPorSemana(ventasFiltradas);
    case 'mes':
      return calcularVentasPorMes(ventasFiltradas);
    case 'trimestre':
      return calcularVentasPorTrimestre(ventasFiltradas);
    case 'año':
      return calcularVentasPorAño(ventasFiltradas);
    default:
      return calcularVentasPorMes(ventasFiltradas);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularVentasPorTipoPago(mediosPago: any[], cuentasTesoreria: any[], ventas: any[]): Array<{tipo: string, ventas: number, color: string, posicion: number}> {
  if (mediosPago.length === 0) {
    return [];
  }

  // Crear un Set con los IDs de las ventas que están dentro del período filtrado
  const ventasEnPeriodo = new Set(ventas.map(v => v.id));
  
  // console.log('Total de ventas obtenidas:', ventas.length);
  // console.log('IDs de ventas en período:', Array.from(ventasEnPeriodo));
  // console.log('Fechas de ventas:', ventas.map(v => ({ id: v.id, fecha: v.fecha })));
  
  // Debug: Ver la estructura de los medios de pago
  // console.log('Estructura de medios de pago:', mediosPago.slice(0, 3).map(mp => ({
  //   idd: mp.idd,
  //   fk_id_orden: mp.fk_id_orden,
  //   fk_id_cuenta_tesoreria: mp.fk_id_cuenta_tesoreria,
  //   monto_pagado: mp.monto_pagado
  // })));
  
  // Filtrar medios de pago para incluir solo aquellos que correspondan a ventas en el período
  const mediosPagoFiltrados = mediosPago.filter(medio => ventasEnPeriodo.has(medio.fk_id_orden));
  
  // console.log('Total medios de pago:', mediosPago.length);
  // console.log('Medios de pago filtrados:', mediosPagoFiltrados.length);
  // console.log('Medios de pago filtrados detalle:', mediosPagoFiltrados);
  
  // Agrupar por cuenta de tesorería y contar órdenes únicas
  const ventasPorCuenta: Record<number, { descripcion: string, ordenesUnicas: Set<number>, color: string }> = {};
  
  // Agrupar medios de pago por orden de venta
  const mediosPorOrden: Record<number, any[]> = {};
  mediosPagoFiltrados.forEach(medio => {
    const ordenId = medio.fk_id_orden;
    if (!mediosPorOrden[ordenId]) {
      mediosPorOrden[ordenId] = [];
    }
    mediosPorOrden[ordenId].push(medio);
  });

  // Para cada orden, contar las cuentas de tesorería utilizadas
  Object.values(mediosPorOrden).forEach(mediosDeOrden => {
    mediosDeOrden.forEach(medio => {
      const cuentaId = medio.fk_id_cuenta_tesoreria;
      const cuenta = cuentasTesoreria.find(c => c.id === cuentaId);
      
      if (!ventasPorCuenta[cuentaId]) {
        ventasPorCuenta[cuentaId] = {
          descripcion: cuenta?.descripcion || 'Sin especificar',
          ordenesUnicas: new Set(),
          color: '#3b82f6' // Color por defecto, se actualizará en el ranking
        };
      }
      
      // Agregar la orden de venta al set para contar únicamente
      ventasPorCuenta[cuentaId].ordenesUnicas.add(medio.fk_id_orden);
    });
  });

  // Debug: Ver qué se está contando
  // console.log('Ventas por cuenta calculadas:', ventasPorCuenta);

  // Convertir a array y ordenar por el número de órdenes únicas
  const ranking = Object.values(ventasPorCuenta).sort((a, b) => b.ordenesUnicas.size - a.ordenesUnicas.size);

  // Asignar posición y color
  return ranking.map((cuenta, index) => ({
    tipo: cuenta.descripcion,
    ventas: cuenta.ordenesUnicas.size,
    color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'][index % 8], // Colores diferentes para cada posición
    posicion: index + 1
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularRankingProductos(detallesVenta: any[], articulos: any[], ventas: any[]) {
  // Agrupar por fk_id_articulo
  const resumen: Record<number, { producto: string, unidades: number, ingresos: number, costo: number, color: string }> = {};
  
  // Crear un mapa de órdenes para acceder rápidamente a los totales
  const ordenesMap = new Map();
  ventas.forEach(venta => {
    ordenesMap.set(venta.id, venta);
  });
  
  // Agrupar detalles por orden para calcular factores de descuento
  const detallesPorOrden = new Map();
  detallesVenta.forEach(detalle => {
    if (!detallesPorOrden.has(detalle.fk_id_orden)) {
      detallesPorOrden.set(detalle.fk_id_orden, []);
    }
    detallesPorOrden.get(detalle.fk_id_orden).push(detalle);
  });
  
  detallesVenta.forEach((detalle, idx) => {
    const articulo = articulos.find(a => a.id === detalle.fk_id_articulo);
    if (!articulo) return;
    
    const key = detalle.fk_id_articulo;
    
    // Calcular precio con descuentos aplicados
    const orden = ordenesMap.get(detalle.fk_id_orden);
    let precioFinal = detalle.precio_unitario || 0;
    
    if (orden) {
      const detallesOrden = detallesPorOrden.get(detalle.fk_id_orden) || [];
      const totalSinDescuento = detallesOrden.reduce((sum: number, det: any) => 
        sum + ((det.precio_unitario || 0) * (det.cantidad || 0)), 0);
      const totalConDescuento = orden.total || 0;
      const factorDescuento = totalSinDescuento > 0 ? totalConDescuento / totalSinDescuento : 1;
      precioFinal = (detalle.precio_unitario || 0) * factorDescuento;
    }
    
    if (!resumen[key]) {
      resumen[key] = {
        producto: articulo.descripcion,
        unidades: 0,
        ingresos: 0,
        costo: 0,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5],
      };
    }
    resumen[key].unidades += detalle.cantidad || 0;
    resumen[key].ingresos += precioFinal * (detalle.cantidad || 0);
    resumen[key].costo += (articulo.precio_costo || 0) * (detalle.cantidad || 0);
  });
  
  // Convertir a array y ordenar por unidades vendidas
  return Object.values(resumen)
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5)
    .map((item) => ({
      producto: item.producto,
      ventas: item.unidades,
      ingresos: item.ingresos,
      costos: item.costo,
      ganancia: item.ingresos - item.costo,
      rentabilidad: item.costo > 0 ? ((item.ingresos - item.costo) / item.costo) * 100 : 100,
      color: item.color,
      stock: 0, // No relevante para el ranking, pero requerido por el tipo
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calcularMetricasDiarias(ventas: any[]): Array<{dia: string, ventas: number, clientes: number, productos: number}> {
  if (ventas.length === 0) {
    // Si no hay ventas, retornar array vacío
    return [];
  }

  // Obtener el rango de fechas de las ventas
  const fechas = ventas.map(v => new Date(v.fecha));
  const minFecha = new Date(Math.min(...fechas.map(f => f.getTime())));
  const maxFecha = new Date(Math.max(...fechas.map(f => f.getTime())));

  // Generar todas las fechas del rango
  const dias = [];
  const d = new Date(minFecha);
  while (d <= maxFecha) {
    dias.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Contar ventas por fecha exacta
  const ventasPorFecha: Record<string, number> = {};
  ventas.forEach(venta => {
    if (venta.fecha) {
      const fechaStr = venta.fecha.slice(0, 10); // yyyy-mm-dd
      ventasPorFecha[fechaStr] = (ventasPorFecha[fechaStr] || 0) + 1;
    }
  });

  // Armar array para el gráfico
  return dias.map(dateObj => {
    const fechaStr = dateObj.toISOString().slice(0, 10);
    return {
      dia: fechaStr,
      ventas: ventasPorFecha[fechaStr] || 0,
      clientes: 0,
      productos: 0
    };
  });
}

function calcularRendimientoVendedores(): Array<{vendedor: string, ventas: number, meta: number, color: string}> {
  // Simular vendedores (en producción esto vendría de empleados)
  const vendedores = [
    { vendedor: 'María G.', ventas: 85, meta: 100, color: '#3b82f6' },
    { vendedor: 'Carlos L.', ventas: 92, meta: 100, color: '#10b981' },
    { vendedor: 'Ana R.', ventas: 78, meta: 100, color: '#f59e0b' },
    { vendedor: 'Luis M.', ventas: 88, meta: 100, color: '#ef4444' }
  ];

  return vendedores;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generarAlertas(articulos: any[], ventas: any[], clientes: any[]): Array<{tipo: 'warning' | 'success' | 'info', titulo: string, mensaje: string}> {
  const alertas = [];

  // Alerta de stock bajo
  const articulosStockBajo = articulos.filter(a => (a.stock || 0) < (a.stock_minimo || 0));
  if (articulosStockBajo.length > 0) {
    alertas.push({
      tipo: 'warning' as const,
      titulo: 'Stock Bajo',
      mensaje: `${articulosStockBajo.length} artículos con stock por debajo del mínimo`
    });
  }

  // Alerta de ventas exitosas
  const ventasRecientes = ventas.filter(v => {
    const fecha = new Date(v.fecha);
    const hoy = new Date();
    const diffTime = Math.abs(hoy.getTime() - fecha.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  });

  if (ventasRecientes.length > 0) {
    const totalVentasRecientes = ventasRecientes.reduce((sum, v) => sum + (v.total || 0), 0);
    if (totalVentasRecientes > 50000) {
      alertas.push({
        tipo: 'success' as const,
        titulo: 'Meta Superada',
        mensaje: 'Ventas 15% por encima del objetivo'
      });
    }
  }

  // Alerta de nuevos clientes
  const clientesRecientes = clientes.filter(c => {
    const fecha = new Date(c.creado_el);
    const hoy = new Date();
    const diffTime = Math.abs(hoy.getTime() - fecha.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  });

  if (clientesRecientes.length > 0) {
    alertas.push({
      tipo: 'info' as const,
      titulo: 'Nuevos Clientes',
      mensaje: `${clientesRecientes.length} nuevos clientes este mes`
    });
  }

  return alertas;
}

// Función para calcular fechas según el período seleccionado
function calcularFechasPeriodo(periodo: string): { fechaInicio: Date, fechaFin: Date } {
  const ahora = new Date();
  const fechaFin = new Date(ahora);
  const fechaInicio = new Date(ahora);

  switch (periodo) {
    case 'semana':
      fechaInicio.setDate(ahora.getDate() - 7);
      break;
    case 'mes':
      fechaInicio.setMonth(ahora.getMonth() - 1);
      break;
    case 'trimestre':
      fechaInicio.setMonth(ahora.getMonth() - 3);
      break;
    case 'año':
      fechaInicio.setFullYear(ahora.getFullYear() - 1);
      break;
    default:
      fechaInicio.setMonth(ahora.getMonth() - 1);
  }

  return { fechaInicio, fechaFin };
}

// Funciones auxiliares para calcular ventas por diferentes períodos
function generarPeriodosVacios(periodo: string): Array<{mes: string, ventas: number, meta: number}> {
  switch (periodo) {
    case 'semana':
      return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => ({
        mes: dia,
        ventas: 0,
        meta: 10000
      }));
    case 'mes':
      return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map(semana => ({
        mes: semana,
        ventas: 0,
        meta: 12500
      }));
    case 'trimestre':
      return ['Mes 1', 'Mes 2', 'Mes 3'].map(mes => ({
        mes,
        ventas: 0,
        meta: 50000
      }));
    case 'año':
      return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map(mes => ({
        mes,
        ventas: 0,
        meta: 50000
      }));
    default:
      return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map(semana => ({
        mes: semana,
        ventas: 0,
        meta: 12500
      }));
  }
}

function calcularVentasPorSemana(ventas: any[]): Array<{mes: string, ventas: number, meta: number}> {
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const ventasPorDia = new Array(7).fill(0);

  ventas.forEach(venta => {
    if (venta.fecha) {
      try {
        const fecha = new Date(venta.fecha);
        const dia = fecha.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const indice = dia === 0 ? 6 : dia - 1; // Convertir a índice 0-6 (Lun-Dom)
        ventasPorDia[indice] += venta.total || 0;
      } catch (error) {
        console.warn('Error procesando fecha de venta:', venta.fecha, error);
      }
    }
  });

  return dias.map((dia, index) => ({
    mes: dia,
    ventas: Math.round(ventasPorDia[index]),
    meta: 10000
  }));
}

function calcularVentasPorMes(ventas: any[]): Array<{mes: string, ventas: number, meta: number}> {
  const semanas = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
  const ventasPorSemana = new Array(4).fill(0);

  ventas.forEach(venta => {
    if (venta.fecha) {
      try {
        const fecha = new Date(venta.fecha);
        const dia = fecha.getDate();
        const semana = Math.floor((dia - 1) / 7);
        if (semana >= 0 && semana < 4) {
          ventasPorSemana[semana] += venta.total || 0;
        }
      } catch (error) {
        console.warn('Error procesando fecha de venta:', venta.fecha, error);
      }
    }
  });

  return semanas.map((semana, index) => ({
    mes: semana,
    ventas: Math.round(ventasPorSemana[index]),
    meta: 12500
  }));
}

function calcularVentasPorTrimestre(ventas: any[]): Array<{mes: string, ventas: number, meta: number}> {
  const meses = ['Mes 1', 'Mes 2', 'Mes 3'];
  const ventasPorMes = new Array(3).fill(0);

  ventas.forEach(venta => {
    if (venta.fecha) {
      try {
        const fecha = new Date(venta.fecha);
        const mes = fecha.getMonth();
        const mesRelativo = mes % 3;
        ventasPorMes[mesRelativo] += venta.total || 0;
      } catch (error) {
        console.warn('Error procesando fecha de venta:', venta.fecha, error);
      }
    }
  });

  return meses.map((mes, index) => ({
    mes,
    ventas: Math.round(ventasPorMes[index]),
    meta: 50000
  }));
}

function calcularVentasPorAño(ventas: any[]): Array<{mes: string, ventas: number, meta: number}> {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const ventasPorMes = new Array(12).fill(0);

  ventas.forEach(venta => {
    if (venta.fecha) {
      try {
        const fecha = new Date(venta.fecha);
        const mes = fecha.getMonth();
        ventasPorMes[mes] += venta.total || 0;
      } catch (error) {
        console.warn('Error procesando fecha de venta:', venta.fecha, error);
      }
    }
  });

  return meses.map((mes, index) => ({
    mes,
    ventas: Math.round(ventasPorMes[index]),
    meta: 50000
  }));
} 