"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Milk, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface MilkConsumptionData {
  total_ml_consumido: number;
  total_litros_consumidos: number;
  ordenes_con_leche: number;
  promedio_ml_por_venta: number;
}

interface MilkConsumptionByArticle {
  articulo: string;
  ml_por_unidad: number;
  total_unidades_vendidas: number;
  total_ml_consumido: number;
  total_litros_consumidos: number;
  ordenes_que_lo_incluyeron?: number;
  fk_id_articulo: number;
}


interface MilkControlStatus {
  articulo_leche: string;
  stock_litros_disponibles: number;
  ml_acumulados_consumidos: number;
  ml_totales_disponibles: number;
}

export function MilkConsumptionAnalytics() {
  const [monthlyData, setMonthlyData] = React.useState<MilkConsumptionData | null>(null);
  const [todayData, setTodayData] = React.useState<MilkConsumptionData | null>(null);
  const [byArticleData, setByArticleData] = React.useState<MilkConsumptionByArticle[]>([]);
  const [milkStatus, setMilkStatus] = React.useState<MilkControlStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchMilkAnalytics();
  }, []);

  const fetchMilkAnalytics = async () => {
    try {
      setLoading(true);

      // Estado actual del control de leche - artículo ID 27 específicamente
      const { data: lecheArticulo } = await supabase
        .from('articulos')
        .select('id, descripcion, stock, equivalencia')
        .eq('id', 27)
        .single();

      const { data: controlMl } = await supabase
        .from('control_ml_leche')
        .select('*')
        .eq('fk_id_articulo_leche', 27)
        .single();

      // Consumo del mes actual
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      const { data: monthlyConsumption } = await supabase
        .from('consumo_leche')
        .select('total_ml_consumido')
        .gte('fecha_consumo', currentMonthStart.toISOString());

      // Consumo de hoy
      const today = new Date().toISOString().slice(0, 10);
      const { data: todayConsumption } = await supabase
        .from('consumo_leche')
        .select('total_ml_consumido, fk_id_orden')
        .gte('fecha_consumo', today)
        .lt('fecha_consumo', today + 'T23:59:59');

      // Consumo por artículo (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: consumptionByArticle } = await supabase
        .from('consumo_leche')
        .select(`
          fk_id_articulo,
          cantidad_vendida,
          equivalencia_ml,
          total_ml_consumido,
          articulos:fk_id_articulo (descripcion)
        `)
        .gte('fecha_consumo', thirtyDaysAgo.toISOString());

      // Procesar datos
      const monthlyTotal = monthlyConsumption?.reduce((sum, item) => sum + Number(item.total_ml_consumido), 0) || 0;
      const todayTotal = todayConsumption?.reduce((sum, item) => sum + Number(item.total_ml_consumido), 0) || 0;
      const uniqueOrdersToday = new Set(todayConsumption?.map(item => item.fk_id_orden) || []).size;
      const uniqueOrdersMonth = monthlyConsumption?.length || 0;

      // Agrupar por artículo
      const groupedByArticle = consumptionByArticle?.reduce((acc: MilkConsumptionByArticle[], item: {
        fk_id_articulo: number;
        cantidad_vendida: number;
        equivalencia_ml: number;
        total_ml_consumido: number;
        articulos: { descripcion: string } | { descripcion: string }[] | null;
      }) => {
        const existing = acc.find(a => a.fk_id_articulo === item.fk_id_articulo);
        if (existing) {
          existing.total_unidades_vendidas += Number(item.cantidad_vendida);
          existing.total_ml_consumido += Number(item.total_ml_consumido);
        } else {
          // Supabase devuelve articulos como array, tomamos el primer elemento
          const articuloDescripcion = Array.isArray(item.articulos) && item.articulos.length > 0
            ? item.articulos[0]?.descripcion
            : (item.articulos as { descripcion: string })?.descripcion || 'Artículo desconocido';

          acc.push({
            articulo: articuloDescripcion,
            ml_por_unidad: Number(item.equivalencia_ml),
            total_unidades_vendidas: Number(item.cantidad_vendida),
            total_ml_consumido: Number(item.total_ml_consumido),
            total_litros_consumidos: Number(item.total_ml_consumido) / 1000,
            fk_id_articulo: Number(item.fk_id_articulo)
          });
        }
        return acc;
      }, []) || [];

      setMonthlyData({
        total_ml_consumido: monthlyTotal,
        total_litros_consumidos: monthlyTotal / 1000,
        ordenes_con_leche: uniqueOrdersMonth,
        promedio_ml_por_venta: uniqueOrdersMonth > 0 ? monthlyTotal / uniqueOrdersMonth : 0
      });

      setTodayData({
        total_ml_consumido: todayTotal,
        total_litros_consumidos: todayTotal / 1000,
        ordenes_con_leche: uniqueOrdersToday,
        promedio_ml_por_venta: uniqueOrdersToday > 0 ? todayTotal / uniqueOrdersToday : 0
      });

      setByArticleData(groupedByArticle.sort((a, b) => b.total_ml_consumido - a.total_ml_consumido).slice(0, 10));

      if (lecheArticulo) {
        // Calcular ML disponibles reales
        const stockEnMl = lecheArticulo.stock * 1000; // Stock en litros convertido a ML
        const mlAcumuladosConsumidos = controlMl?.ml_acumulados_consumidos || 0;
        const mlTotalesDisponibles = stockEnMl - mlAcumuladosConsumidos;

        setMilkStatus({
          articulo_leche: lecheArticulo.descripcion,
          stock_litros_disponibles: lecheArticulo.stock,
          ml_acumulados_consumidos: mlAcumuladosConsumidos,
          ml_totales_disponibles: mlTotalesDisponibles
        });
      } else {
        // Si no existe el artículo ID 27, mostrar valores por defecto
        setMilkStatus({
          articulo_leche: 'Leche (ID 27 no encontrado)',
          stock_litros_disponibles: 0,
          ml_acumulados_consumidos: 0,
          ml_totales_disponibles: 0
        });
      }

    } catch (error) {
      console.error('Error fetching milk analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isLowStock = milkStatus && milkStatus.stock_litros_disponibles <= 2;

  return (
    <div className="space-y-6">
      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock de Leche</CardTitle>
            <Milk className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {(milkStatus?.ml_totales_disponibles || 0).toLocaleString()} ml
              {isLowStock && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Bajo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Stock: {(milkStatus?.stock_litros_disponibles || 0)} L • Pendientes: {milkStatus?.ml_acumulados_consumidos || 0} ml
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumo Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(todayData?.total_ml_consumido || 0).toLocaleString()} ml
            </div>
            <p className="text-xs text-muted-foreground">
              {todayData?.ordenes_con_leche || 0} órdenes con leche
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumo Mensual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(monthlyData?.total_ml_consumido || 0).toLocaleString()} ml
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyData?.ordenes_con_leche || 0} órdenes totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
            <Milk className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(monthlyData?.promedio_ml_por_venta || 0)} ml
            </div>
            <p className="text-xs text-muted-foreground">
              Por orden con leche
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de consumo por artículo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5" />
            Consumo de Leche por Artículo
          </CardTitle>
          <CardDescription>
            Artículos que más leche consumen (últimos 30 días)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byArticleData.length > 0 ? (
            <div className="space-y-4">
              {byArticleData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.articulo}</span>
                      <Badge variant="outline">{item.ml_por_unidad} ml/unidad</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.total_unidades_vendidas} unidades vendidas
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {Math.round(item.total_ml_consumido).toLocaleString()} ml
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(item.total_ml_consumido / 1000).toFixed(2)} L total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Milk className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay datos de consumo de leche</p>
              <p className="text-sm">Los datos aparecerán cuando se vendan productos que consuman leche</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerta de stock bajo */}
      {isLowStock && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Stock Bajo de Leche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              Quedan solo {milkStatus?.stock_litros_disponibles} litros de leche en stock.
              Considera reponer el inventario para evitar quedarte sin materia prima.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}