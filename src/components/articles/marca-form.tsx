"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Marca, CreateMarcaData, UpdateMarcaData } from "@/types/marca";

interface MarcaFormProps {
  marca?: Marca;
  onSubmit: (data: CreateMarcaData | UpdateMarcaData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MarcaForm({ marca, onSubmit, onCancel, isLoading = false }: MarcaFormProps) {
  const [descripcion, setDescripcion] = React.useState(marca?.descripcion || "");
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError("La descripción es requerida");
      return;
    }
    setError("");
    onSubmit({ descripcion });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Descripción</label>
        <Input
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Nombre de la marca"
          disabled={isLoading}
        />
        {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>{isLoading ? "Guardando..." : marca ? "Actualizar" : "Crear"}</Button>
      </div>
    </form>
  );
} 