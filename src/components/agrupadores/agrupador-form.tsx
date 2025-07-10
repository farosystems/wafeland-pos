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
import { Agrupador } from "@/types/agrupador";

const agrupadorSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
});

type AgrupadorFormValues = z.infer<typeof agrupadorSchema>;

interface AgrupadorFormProps {
  agrupador?: Agrupador;
  onSubmit: (data: AgrupadorFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AgrupadorForm({ agrupador, onSubmit, onCancel, isLoading = false }: AgrupadorFormProps) {
  const form = useForm({
    resolver: zodResolver(agrupadorSchema),
    defaultValues: {
      nombre: agrupador?.nombre || "",
    },
  });

  const handleSubmit = (values: AgrupadorFormValues) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ingrese el nombre del agrupador" {...field} />
              </FormControl>
              <FormDescription>
                Nombre del agrupador
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
            {isLoading ? "Guardando..." : agrupador ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 