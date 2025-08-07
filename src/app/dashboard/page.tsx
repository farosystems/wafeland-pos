"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { 
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  Package, Calendar, CreditCard, BarChart3, 
  Activity, Loader2
} from "lucide-react";
import { getDashboardData, DashboardData } from "@/services/dashboard";


export default function DashboardPage() {
  const { user, isSignedIn } = useUser();
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

     useEffect(() => {
     const fetchDashboardData = async () => {
       try {
         setLoading(true);
         const data = await getDashboardData(periodoSeleccionado);
         setDashboardData(data);
       } catch (err) {
         const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
         setError(`Error al cargar los datos del dashboard: ${errorMessage}`);
         console.error('Error detallado:', err);
       } finally {
         setLoading(false);
       }
     };

     if (isSignedIn) {
       fetchDashboardData();
     }
   }, [isSignedIn, periodoSeleccionado]);

  if (!isSignedIn) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Error al cargar datos</h2>
          <p className="text-gray-600 text-center">{error || 'No se pudieron cargar los datos'}</p>
        </div>
      </div>
    );
  }

  const { 
    totalVentas, 
    totalClientes, 
    totalProductos, 
    ventasPorPeriodo, 
    rankingMediosPago, 
    metricasDiarias
  } = dashboardData;

     const promedioVentas = ventasPorPeriodo.length > 0 ? Math.round(totalVentas / ventasPorPeriodo.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
            {user?.firstName?.[0] || user?.username?.[0] || "U"}
          </span>
        </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
          ¡Bienvenido{user?.firstName ? ", " + user.firstName : ""}!
        </h1>
                <p className="text-gray-600">Aquí tienes un resumen de tu negocio</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select 
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mes</option>
                <option value="trimestre">Último trimestre</option>
                <option value="año">Último año</option>
              </select>
            </div>
          </div>
        </div>
      </div>

             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Métricas Principales */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                <p className="text-2xl font-bold text-gray-900">${totalVentas.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">{ventasPorPeriodo.length} ventas</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio Mensual</p>
                <p className="text-2xl font-bold text-gray-900">${promedioVentas.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <Activity className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">Estable</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{totalProductos.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <Package className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">En inventario</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                <p className="text-2xl font-bold text-gray-900">{totalClientes.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <Users className="w-4 h-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">Registrados</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

                 {/* Gráficos Principales */}
         <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                     {/* Gráfico de Ventas por Período */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 xl:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Ventas por Período</h3>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">Ventas</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-sm text-gray-600">Meta</span>
                </div>
              </div>
            </div>
                         <ResponsiveContainer width="100%" height={400}>
               <AreaChart data={ventasPorPeriodo}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fill="url(#colorVentas)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="meta" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

                     {/* Gráfico de Ventas por Tipo de Pago */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <div className="flex items-center justify-between mb-6">
               <div>
                 <h3 className="text-lg font-semibold text-gray-900">Ranking de Medios de Pago</h3>
                 <div className="flex items-center space-x-2">
                   <CreditCard className="w-5 h-5 text-gray-500" />
                   <span className="text-sm text-gray-600">Más utilizados</span>
                 </div>
               </div>
             </div>
             <div className="space-y-3">
               {rankingMediosPago.length > 0 ? (
                 rankingMediosPago.map((medio) => (
                   <div
                     key={medio.tipo}
                     className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-white to-gray-50 hover:shadow-md transition-shadow"
                   >
                     <div className="flex items-center gap-3">
                       <div 
                         className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                         style={{ backgroundColor: medio.color }}
                       >
                         {medio.posicion}
                       </div>
                       <div>
                         <p className="font-medium text-gray-900">{medio.tipo}</p>
                         <p className="text-sm text-gray-500">{medio.ventas} ventas</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-2xl font-bold text-gray-900">{medio.ventas}</div>
                       <div className="text-xs text-gray-500">ventas</div>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-8 text-gray-500">
                   <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                   <p>No hay datos de medios de pago</p>
                 </div>
               )}
             </div>
           </div>
        </div>

                                   {/* Gráficos Secundarios */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                      {/* Métricas Diarias */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 xl:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Actividad Diaria</h3>
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
                         <ResponsiveContainer width="100%" height={350}>
               <LineChart data={metricasDiarias}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dia" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ventas" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="clientes" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

         
      </div>
    </div>
  );
}
