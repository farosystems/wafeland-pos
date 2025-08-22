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
  mark_up: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El mark up debe ser mayor o igual a 0" }).optional(),
  precio_costo: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El precio de costo debe ser mayor o igual a 0" }).optional(),
  // Campos para ajuste de stock (solo en edición)
  stock_a_descontar: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El stock a descontar debe ser mayor o igual a 0" }).optional(),
  stock_nuevo: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El stock nuevo debe ser mayor o igual a 0" }).optional(),
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
      mark_up: article?.mark_up ?? 0,
      precio_costo: article?.precio_costo ?? 0,
      stock_a_descontar: 0,
      stock_nuevo: 0,
    },
  });

  const { checkTrial } = useTrialCheck();
  const [showTrialEnded, setShowTrialEnded] = React.useState(false);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const expired = await checkTrial(() => setShowTrialEnded(true));
    if (expired) return;

    // Preparar los datos base del formulario (sin campos de ajuste de stock)
    const formData = {
      descripcion: values.descripcion as string,
      precio_unitario: Number(values.precio_unitario),
      fk_id_agrupador: Number(values.fk_id_agrupador),
      fk_id_marca: values.fk_id_marca ? Number(values.fk_id_marca) : null,
      activo: values.activo as boolean,
      stock: Number(values.stock),
      stock_minimo: Number(values.stock_minimo),
      mark_up: Number(values.mark_up),
      precio_costo: Number(values.precio_costo),
    };

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
  }, [precioCosto, markUp]);

  // Si el usuario edita el precio unitario manualmente, no recalcular automáticamente
  const handlePrecioUnitarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrecioUnitarioManual(true);
    form.setValue('precio_unitario', e.target.value);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>Cantidad de artículos en stock</FormDescription>
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
          </div>
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