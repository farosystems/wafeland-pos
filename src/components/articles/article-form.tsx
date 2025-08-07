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
import { useVariantes } from "@/hooks/use-variantes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTrialCheck } from "@/hooks/use-trial-check";

const articleSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  precio_unitario: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 0, { message: "El precio debe ser mayor o igual a 0" }),
  fk_id_agrupador: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 1, { message: "El agrupador es requerido" }),
  fk_id_marca: z.union([z.string(), z.number()]).transform(val => val === "" ? null : Number(val)).nullable(),
  activo: z.boolean(),
  mark_up: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El mark up debe ser mayor o igual a 0" }).optional(),
  precio_costo: z.union([z.string(), z.number()]).transform(val => val === '' ? 0 : Number(val)).refine(val => !isNaN(val) && val >= 0, { message: "El precio de costo debe ser mayor o igual a 0" }).optional(),
});

// type ArticleFormValues = z.infer<typeof articleSchema>;

interface ArticleFormProps {
  article?: Article;
  onSave: (data: CreateArticleData | UpdateArticleData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ArticleForm({ article, onSave, onCancel, isLoading = false }: ArticleFormProps) {
  const { agrupadores } = useAgrupadores();
  const { marcas } = useMarcas();
  const { variantes } = useVariantes();
  const form = useForm({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      descripcion: article?.descripcion || "",
      precio_unitario: article?.precio_unitario || 0,
      fk_id_agrupador: article?.fk_id_agrupador || 1,
      fk_id_marca: article?.fk_id_marca ?? null,
      activo: article?.activo ?? true,
      mark_up: article?.mark_up ?? 0,
      precio_costo: article?.precio_costo ?? 0,
    },
  });

  // Eliminar cualquier setValue('stock', ...) y dependencias de stockNuevo/stockDescontar en useEffect

  const { checkTrial } = useTrialCheck();
  const [showTrialEnded, setShowTrialEnded] = React.useState(false);

  const handleSubmit = async (values: Record<string, unknown>) => {
    const expired = await checkTrial(() => setShowTrialEnded(true));
    if (expired) return;
    onSave({
      ...values,
      precio_unitario: Number(values.precio_unitario),
      fk_id_agrupador: Number(values.fk_id_agrupador),
      mark_up: Number(values.mark_up),
      precio_costo: Number(values.precio_costo),
    });
  };

  // Calcular stock total como sumatoria de variantes
  const stockTotal = article ? variantes.filter(v => v.fk_id_articulo === article.id).reduce((acc, v) => acc + v.stock_unitario, 0) : 0;

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
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
              name="precio_unitario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Unitario</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={handlePrecioUnitarioChange} />
                  </FormControl>
                  <FormDescription>Precio unitario del artículo (se calcula automáticamente si completas costo y mark up, pero puedes modificarlo manualmente)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Rentabilidad (%)</label>
              <Input type="text" value={rentabilidad} readOnly disabled className="bg-gray-100" />
              <div className="text-xs text-muted-foreground mt-1">Rentabilidad calculada según precio de costo y unitario</div>
            </div>
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
                      <option value="">Seleccione un agrupador</option>
                      {agrupadores.map((agrupador) => (
                        <option key={agrupador.id} value={agrupador.id}>{agrupador.nombre}</option>
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
          <div className="space-y-4">
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
            <div>
              <label className="block text-sm font-medium mb-1">Stock total</label>
              <Input type="number" value={stockTotal} readOnly disabled className="bg-gray-100" />
              <div className="text-xs text-muted-foreground mt-1">Sumatoria de stock de todas las variantes</div>
            </div>
          </div>
        </div>
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