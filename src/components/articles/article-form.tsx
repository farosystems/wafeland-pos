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

const articleSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida"),
  precio_unitario: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 0, { message: "El precio debe ser mayor o igual a 0" }),
  fk_id_agrupador: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 1, { message: "El agrupador es requerido" }),
  activo: z.boolean(),
  porcentaje_iva: z.union([z.string(), z.number()]).transform(Number).refine(val => !isNaN(val) && val >= 0, { message: "El IVA debe ser mayor o igual a 0" }),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface ArticleFormProps {
  article?: Article;
  onSubmit: (data: CreateArticleData | UpdateArticleData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ArticleForm({ article, onSubmit, onCancel, isLoading = false }: ArticleFormProps) {
  const { agrupadores } = useAgrupadores();
  const form = useForm({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      descripcion: article?.descripcion || "",
      precio_unitario: article?.precio_unitario || 0,
      fk_id_agrupador: article?.fk_id_agrupador || 1,
      activo: article?.activo ?? true,
      porcentaje_iva: article?.porcentaje_iva || 0,
    },
  });

  const handleSubmit = (values: any) => {
    onSubmit({
      ...values,
      precio_unitario: Number(values.precio_unitario),
      fk_id_agrupador: Number(values.fk_id_agrupador),
      porcentaje_iva: Number(values.porcentaje_iva),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ingrese la descripción del artículo" {...field} />
              </FormControl>
              <FormDescription>
                Descripción detallada del artículo
              </FormDescription>
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
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormDescription>
                Precio unitario del artículo
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
                  <option value="">Seleccione un agrupador</option>
                  {agrupadores.map((agrupador) => (
                    <option key={agrupador.id} value={agrupador.id}>
                      {agrupador.nombre}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Selecciona el agrupador del artículo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activo</FormLabel>
              <FormControl>
                <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
              </FormControl>
              <FormDescription>
                ¿El artículo está activo?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="porcentaje_iva"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Porcentaje IVA</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormDescription>
                Porcentaje de IVA aplicado
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : article ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 