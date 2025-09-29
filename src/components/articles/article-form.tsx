"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";
import { useAgrupadores } from "@/hooks/use-agrupadores";
import { useMarcas } from "@/hooks/use-marcas";
import { getArticles } from "@/services/articles";
import { calcularStockComboFrontend, getDetalleStockCombo } from "@/services/combos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTrialCheck } from "@/hooks/use-trial-check";
import { createMovimientoStock } from "@/services/movimientosStock";

const articleSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  precio_unitario: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 0, { message: "El precio debe ser mayor o igual a 0" }),
  fk_id_agrupador: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 1, { message: "El agrupador es requerido" }),
  fk_id_marca: z.union([z.string(), z.number()]).transform(val => val === "" ? null : Number(val)).nullable(),
  activo: z.boolean(),
  stock: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 0, { message: "El stock debe ser mayor o igual a 0" }),
  stock_minimo: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 0, { message: "El stock mínimo debe ser mayor o igual a 0" }),
  equivalencia: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "La equivalencia debe ser mayor o igual a 0" }),
  mark_up: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El mark up debe ser mayor o igual a 0" }).optional(),
  precio_costo: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El precio de costo debe ser mayor o igual a 0" }).optional(),
  es_combo: z.boolean(),
  // Campos para ajuste de stock (solo en edición)
  stock_a_descontar: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El stock a descontar debe ser mayor o igual a 0" }).optional(),
  stock_nuevo: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El stock nuevo debe ser mayor o igual a 0" }).optional(),
  // Campo local para auto-calcular equivalencia (no se envía al servidor)
  es_articulo_leche: z.boolean().optional(),
});

interface ArticleFormProps {
  article?: Article;
  onSave: (data: CreateArticleData | UpdateArticleData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ArticleForm({ article, onSave, onCancel, isLoading = false }: ArticleFormProps) {
  const { agrupadores } = useAgrupadores();
  const { marcas } = useMarcas();
  const [articulos, setArticulos] = React.useState<Article[]>([]);
  const [componentesCombo, setComponentesCombo] = React.useState<{id: number, fk_articulo_componente: number, cantidad: number}[]>([]);

  const form = useForm({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      descripcion: article?.descripcion || "",
      precio_unitario: article?.precio_unitario || 0,
      fk_id_agrupador: article?.fk_id_agrupador || 1,
      fk_id_marca: article?.fk_id_marca ?? null,
      activo: article?.activo ?? true,
      stock: article?.stock ?? 0,
      stock_minimo: article?.stock_minimo ?? 0,
      equivalencia: article?.equivalencia ?? 0,
      mark_up: article?.mark_up ?? 0,
      precio_costo: article?.precio_costo ?? 0,
      es_combo: article?.es_combo ?? false,
      stock_a_descontar: 0,
      stock_nuevo: 0,
      es_articulo_leche: false,
    },
  });

  const { checkTrial } = useTrialCheck();
  const [showTrialEnded, setShowTrialEnded] = React.useState(false);

  // Cargar artículos para el combo
  React.useEffect(() => {
    async function loadArticulos() {
      try {
        const data = await getArticles();
        // Filtrar artículos activos y no combos (o el artículo actual si estamos editando)
        const filtrados = data.filter(art =>
          art.activo &&
          !art.es_combo &&
          (article ? art.id !== article.id : true)
        );
        setArticulos(filtrados);
      } catch (error) {
        console.error('Error al cargar artículos:', error);
      }
    }
    loadArticulos();
  }, [article]);

  // Cargar componentes del combo si estamos editando
  React.useEffect(() => {
    if (article?.componentes) {
      setComponentesCombo(article.componentes.map((comp, index) => ({
        id: index,
        fk_articulo_componente: comp.fk_articulo_componente,
        cantidad: comp.cantidad
      })));
    }
  }, [article]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const expired = await checkTrial(() => setShowTrialEnded(true));
    if (expired) return;

    // Validar que si es combo, tenga componentes
    if (values.es_combo && componentesCombo.length === 0) {
      alert('Si el artículo es un combo, debe agregar al menos un componente.');
      return;
    }

    // Validar que los componentes tengan artículo y cantidad válida
    if (values.es_combo) {
      for (const comp of componentesCombo) {
        if (!comp.fk_articulo_componente || comp.fk_articulo_componente === 0) {
          alert('Todos los componentes deben tener un artículo seleccionado.');
          return;
        }
        if (!comp.cantidad || comp.cantidad <= 0) {
          alert('Todos los componentes deben tener una cantidad mayor a 0.');
          return;
        }
      }
    }

    // Preparar los datos base del formulario (sin campos de ajuste de stock)
    const formData = {
      descripcion: values.descripcion as string,
      precio_unitario: Number(values.precio_unitario),
      fk_id_agrupador: Number(values.fk_id_agrupador),
      fk_id_marca: values.fk_id_marca ? Number(values.fk_id_marca) : null,
      activo: values.activo as boolean,
      stock: Number(values.stock),
      stock_minimo: Number(values.stock_minimo),
      equivalencia: Number(values.equivalencia),
      mark_up: Number(values.mark_up),
      precio_costo: Number(values.precio_costo),
      es_combo: values.es_combo as boolean,
      componentes: (values.es_combo as boolean) ? componentesCombo.map(comp => ({
        fk_articulo_componente: comp.fk_articulo_componente,
        cantidad: comp.cantidad
      })) : []
    };

    console.log('FormData enviada:', formData);

    // Si estamos editando un artículo y hay ajustes de stock
    if (article) {
      const stockADescontar = Number(values.stock_a_descontar) || 0;
      const stockNuevo = Number(values.stock_nuevo) || 0;
      const stockActual = Number(values.stock);
      
      // Calcular el nuevo stock final
      const nuevoStockFinal = stockActual - stockADescontar + stockNuevo;
      
      // Actualizar el stock en los datos del formulario
      formData.stock = nuevoStockFinal;

      // Crear movimientos de stock si hay ajustes
      if (stockADescontar > 0) {
        try {
          await createMovimientoStock({
            fk_id_orden: null,
            fk_id_articulos: article.id,
            origen: "AJUSTE",
            tipo: "salida",
            cantidad: stockADescontar,
            stock_actual: nuevoStockFinal,
          });
        } catch (error) {
          console.error("Error al crear movimiento de stock (salida):", error);
        }
      }

      if (stockNuevo > 0) {
        try {
          await createMovimientoStock({
            fk_id_orden: null,
            fk_id_articulos: article.id,
            origen: "AJUSTE",
            tipo: "entrada",
            cantidad: stockNuevo,
            stock_actual: nuevoStockFinal,
          });
        } catch (error) {
          console.error("Error al crear movimiento de stock (entrada):", error);
        }
      }
    }

    onSave(formData);
  };

  const [precioUnitarioManual, setPrecioUnitarioManual] = React.useState(false);

  // Calcular rentabilidad
  const precioCosto = form.watch('precio_costo');
  const markUp = form.watch('mark_up');
  const precioUnitario = form.watch('precio_unitario');
  let rentabilidad = '-';
  if (precioCosto && !isNaN(Number(precioCosto)) && Number(precioCosto) > 0 && precioUnitario && !isNaN(Number(precioUnitario))) {
    rentabilidad = (((Number(precioUnitario) - Number(precioCosto)) / Number(precioCosto)) * 100).toFixed(2) + '%';
  }

  // Calcular precio unitario automáticamente si precio_costo y mark_up cambian y el usuario no lo editó manualmente
  React.useEffect(() => {
    if (!precioUnitarioManual && precioCosto !== undefined && markUp !== undefined && !isNaN(Number(precioCosto)) && !isNaN(Number(markUp))) {
      const costo = Number(precioCosto);
      const markup = Number(markUp);
      if (costo > 0 && markup >= 0) {
        const nuevoPrecio = (costo * (1 + markup / 100)).toFixed(2);
        form.setValue('precio_unitario', nuevoPrecio);
      }
    }
  }, [precioCosto, markUp, precioUnitarioManual, form]);

  // Si el usuario edita el precio unitario manualmente, no recalcular automáticamente
  const handlePrecioUnitarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrecioUnitarioManual(true);
    form.setValue('precio_unitario', e.target.value);
  };

  // Observar cambios en el checkbox de artículo leche y stock para auto-calcular equivalencia
  const esArticuloLeche = form.watch('es_articulo_leche');
  const stock = form.watch('stock');

  React.useEffect(() => {
    if (esArticuloLeche && stock && !isNaN(Number(stock))) {
      const stockNumerico = Number(stock);
      form.setValue('equivalencia', stockNumerico * 1000);
    }
  }, [esArticuloLeche, stock, form]);

  // También observar cambios en stock cuando es artículo leche para actualizar equivalencia
  const currentStock = form.watch('stock');
  React.useEffect(() => {
    if (esArticuloLeche) {
      if (currentStock && !isNaN(Number(currentStock))) {
        const stockNumerico = Number(currentStock);
        form.setValue('equivalencia', stockNumerico * 1000);
      }
    }
  }, [currentStock, esArticuloLeche, form]);

  // Funciones para manejar componentes del combo
  const agregarComponente = () => {
    const nuevoId = Math.max(0, ...componentesCombo.map(c => c.id)) + 1;
    setComponentesCombo([...componentesCombo, {
      id: nuevoId,
      fk_articulo_componente: 0,
      cantidad: 1
    }]);
  };

  const eliminarComponente = (id: number) => {
    setComponentesCombo(componentesCombo.filter(c => c.id !== id));
  };

  const actualizarComponente = (id: number, campo: 'fk_articulo_componente' | 'cantidad', valor: number) => {
    setComponentesCombo(componentesCombo.map(c =>
      c.id === id ? { ...c, [campo]: valor } : c
    ));
  };

  const esCombo = form.watch('es_combo');

  // Limpiar componentes cuando se desactiva el combo
  React.useEffect(() => {
    if (!esCombo) {
      setComponentesCombo([]);
    }
  }, [esCombo]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-6">
          {/* Primera fila */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese la descripción del artículo" {...field} />
                  </FormControl>
                  <FormDescription>Descripción detallada del artículo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precio_costo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Costo</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Precio de costo del artículo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mark_up"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mark Up (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Porcentaje de mark up aplicado al costo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Segunda fila */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="precio_unitario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Unitario</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field} 
                      onChange={handlePrecioUnitarioChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Precio de venta del artículo. {rentabilidad !== '-' && `Rentabilidad: ${rentabilidad}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fk_id_agrupador"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agrupador</FormLabel>
                  <FormControl>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={field.value}
                      onChange={e => field.onChange(Number(e.target.value))}
                    >
                      {agrupadores.map((agrupador) => (
                        <option key={agrupador.id} value={agrupador.id}>
                          {agrupador.nombre}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>Selecciona el agrupador del artículo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fk_id_marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={field.value ?? ""}
                      onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Sin marca</option>
                      {marcas.map((marca) => (
                        <option key={marca.id} value={marca.id}>{marca.descripcion}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>Selecciona la marca del artículo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Tercera fila */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activo</FormLabel>
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                  </FormControl>
                  <FormDescription>¿El artículo está activo?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="es_combo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Es Combo</FormLabel>
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                  </FormControl>
                  <FormDescription>¿Es un combo de artículos?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      placeholder="0"
                      {...field}
                      disabled={esCombo}
                      className={esCombo ? 'bg-gray-100 cursor-not-allowed' : ''}
                    />
                  </FormControl>
                  <FormDescription>
                    {esCombo
                      ? 'El stock se calcula automáticamente basándose en los componentes'
                      : 'Cantidad de artículos en stock'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock_minimo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Mínimo</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>Cantidad mínima de artículos en stock para alertar</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="equivalencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equivalencia (ml)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.0"
                      lang="en-US"
                      {...field}
                      disabled={form.watch('es_articulo_leche')}
                    />
                  </FormControl>
                  <FormDescription>
                    {form.watch('es_articulo_leche')
                      ? 'Se calcula automáticamente: stock × 1000ml'
                      : 'ML de leche que consume este artículo'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campo para auto-calcular equivalencia de leche */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <FormField
              control={form.control}
              name="es_articulo_leche"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={e => field.onChange(e.target.checked)}
                      className="mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Es artículo de Leche
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Si marcas esta opción, la equivalencia se calculará automáticamente como: stock × 1000ml
                      <br />
                      <strong>Solo para el artículo &quot;Leche&quot; que representa paquetes de 1 litro</strong>
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Sección de componentes del combo */}
          {esCombo && (
            <div className="border rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-green-900">Componentes del Combo</h3>
                <Button
                  type="button"
                  onClick={agregarComponente}
                  variant="outline"
                  size="sm"
                  className="bg-green-100 hover:bg-green-200 text-green-700"
                >
                  Agregar Componente
                </Button>
              </div>

              {componentesCombo.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  <p>No hay componentes agregados.</p>
                  <p className="text-sm">Haz clic en &quot;Agregar Componente&quot; para empezar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {componentesCombo.map((componente) => {
                    const articuloSeleccionado = articulos.find(a => a.id === componente.fk_articulo_componente);
                    return (
                      <div key={componente.id} className="flex items-center gap-4 p-3 bg-white border border-green-200 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Artículo
                          </label>
                          <select
                            className="w-full border rounded px-3 py-2"
                            value={componente.fk_articulo_componente}
                            onChange={(e) => actualizarComponente(componente.id, 'fk_articulo_componente', Number(e.target.value))}
                          >
                            <option value={0}>Seleccionar artículo...</option>
                            {articulos.map((art) => (
                              <option key={art.id} value={art.id}>
                                {art.descripcion} (Stock: {art.stock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={componente.cantidad}
                            onChange={(e) => actualizarComponente(componente.id, 'cantidad', Number(e.target.value))}
                            className="text-center"
                          />
                        </div>
                        {articuloSeleccionado && (
                          <div className="text-sm text-gray-600">
                            <div>Precio: ${articuloSeleccionado.precio_unitario}</div>
                            <div>Stock: {articuloSeleccionado.stock}</div>
                          </div>
                        )}
                        <Button
                          type="button"
                          onClick={() => eliminarComponente(componente.id)}
                          variant="destructive"
                          size="sm"
                        >
                          Eliminar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {componentesCombo.length > 0 && (() => {
                const componentesConInfo = componentesCombo.map(comp => {
                  const articulo = articulos.find(a => a.id === comp.fk_articulo_componente);
                  return {
                    ...comp,
                    articulo_componente: articulo
                  };
                }).filter(comp => comp.articulo_componente);

                const stockCalculado = calcularStockComboFrontend(componentesConInfo);
                const detalleStock = getDetalleStockCombo(componentesConInfo);

                return (
                  <div className="mt-4 space-y-3">
                    {/* Resumen del Combo */}
                    <div className="p-3 bg-green-100 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Resumen del Combo:</h4>
                      <div className="space-y-1 text-sm text-green-700">
                        {componentesCombo.map((comp) => {
                          const articulo = articulos.find(a => a.id === comp.fk_articulo_componente);
                          if (!articulo) return null;
                          return (
                            <div key={comp.id} className="flex justify-between">
                              <span>{comp.cantidad}x {articulo.descripcion}</span>
                              <span>${(comp.cantidad * articulo.precio_unitario).toFixed(2)}</span>
                            </div>
                          );
                        })}
                        <div className="border-t border-green-300 pt-2 mt-2 font-medium">
                          <div className="flex justify-between">
                            <span>Total componentes:</span>
                            <span>
                              $
                              {componentesCombo.reduce((total, comp) => {
                                const articulo = articulos.find(a => a.id === comp.fk_articulo_componente);
                                return total + (articulo ? comp.cantidad * articulo.precio_unitario : 0);
                              }, 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-green-800">
                            <span>Precio del combo:</span>
                            <span>${form.watch('precio_unitario') || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stock Calculado */}
                    <div className={`p-3 border rounded-lg ${
                      stockCalculado === 0 ? 'bg-red-50 border-red-200' :
                      stockCalculado < 5 ? 'bg-orange-50 border-orange-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <h4 className={`text-sm font-medium mb-2 ${
                        stockCalculado === 0 ? 'text-red-800' :
                        stockCalculado < 5 ? 'text-orange-800' :
                        'text-blue-800'
                      }`}>
                        Análisis de Stock Disponible
                      </h4>
                      <div className={`text-sm ${
                        stockCalculado === 0 ? 'text-red-700' :
                        stockCalculado < 5 ? 'text-orange-700' :
                        'text-blue-700'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span>Combos que se pueden formar:</span>
                          <span className="font-bold text-lg">{stockCalculado}</span>
                        </div>
                        {detalleStock.componenteLimitante && (
                          <div className="text-xs">
                            Limitado por: <strong>{detalleStock.componenteLimitante}</strong>
                          </div>
                        )}
                        <div className="mt-2 space-y-1">
                          {detalleStock.detalleComponentes.map((detalle, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{detalle.nombre}</span>
                              <span>
                                {detalle.stockDisponible} ÷ {detalle.cantidadNecesaria} = {detalle.combosConEsteComponente} combos
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> Cuando se venda este combo, se descontará automáticamente el stock de cada componente según las cantidades especificadas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sección de ajuste de stock solo para edición */}
        {article && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Ajuste de Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock_a_descontar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock a Descontar</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>Cantidad de artículos a descontar del stock actual</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock_nuevo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Nuevo a Agregar</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>Cantidad de artículos a agregar al stock actual</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Mostrar el stock resultante */}
            {(() => {
              const stockActual = Number(form.watch('stock')) || 0;
              const stockADescontar = Number(form.watch('stock_a_descontar')) || 0;
              const stockNuevo = Number(form.watch('stock_nuevo')) || 0;
              const stockResultante = stockActual - stockADescontar + stockNuevo;
              
              return (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Resumen de Stock:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Stock Actual:</span>
                      <div className="font-medium">{stockActual}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">A Descontar:</span>
                      <div className="font-medium text-red-600">-{stockADescontar}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">A Agregar:</span>
                      <div className="font-medium text-green-600">+{stockNuevo}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Stock Resultante:</span>
                      <div className={`font-bold ${stockResultante < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {stockResultante}
                      </div>
                    </div>
                  </div>
                  {stockResultante < 0 && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      ⚠️ El stock resultante será negativo. Verifica los valores ingresados.
                    </div>
                  )}
                </div>
              );
            })()}
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> Los ajustes de stock generarán automáticamente registros en la tabla de movimientos de stock.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : article ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
      <Dialog open={showTrialEnded} onOpenChange={setShowTrialEnded}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prueba gratis finalizada</DialogTitle>
            <DialogDescription>
              La prueba gratis ha finalizado. Debe abonar para continuar usando el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowTrialEnded(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
} 