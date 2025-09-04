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
import { Textarea } from "@/components/ui/textarea";
import { Mesa, CreateMesaData } from "@/types/mesa";

const mesaSchema = z.object({
  numero: z.string().min(1, "El número de mesa es requerido"),
  descripcion: z.string().optional(),
  capacidad: z.number().min(1, "La capacidad debe ser mayor a 0").optional().default(4),
  posicion_x: z.number().min(0, "La posición X debe ser mayor o igual a 0").optional().default(100),
  posicion_y: z.number().min(0, "La posición Y debe ser mayor o igual a 0").optional().default(100),
  activo: z.boolean().optional().default(true),
});

interface MesaFormProps {
  mesa?: Mesa;
  onSave: (data: CreateMesaData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MesaForm({ mesa, onSave, onCancel, isLoading = false }: MesaFormProps) {
  const form = useForm<CreateMesaData>({
    resolver: zodResolver(mesaSchema),
    defaultValues: {
      numero: mesa?.numero || "",
      descripcion: mesa?.descripcion || "",
      capacidad: mesa?.capacidad || 4,
      posicion_x: mesa?.posicion_x || 100,
      posicion_y: mesa?.posicion_y || 100,
      activo: mesa?.activo ?? true,
    },
  });

  const handleSubmit = async (values: CreateMesaData) => {
    try {
      await onSave(values);
      form.reset();
    } catch (error) {
      console.error("Error al guardar mesa:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Número de Mesa */}
        <FormField
          control={form.control}
          name="numero"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Mesa *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: 1, A1, VIP-1" 
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Identificador único de la mesa (puede incluir letras y números)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descripción */}
        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Ej: Mesa junto a la ventana, Mesa VIP, etc."
                  className="resize-none"
                  rows={2}
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Descripción opcional para identificar mejor la mesa
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Capacidad */}
        <FormField
          control={form.control}
          name="capacidad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacidad *</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  min={1}
                  max={20}
                  placeholder="4"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                Número máximo de comensales que puede acomodar la mesa
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Posición inicial en el tablero */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="posicion_x"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posición X</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min={0}
                    placeholder="100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Posición horizontal inicial
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="posicion_y"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Posición Y</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    min={0}
                    placeholder="100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Posición vertical inicial
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Guardando..." : mesa ? "Actualizar Mesa" : "Crear Mesa"}
          </Button>
        </div>
      </form>
    </Form>
  );
}