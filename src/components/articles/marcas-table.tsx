"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit } from "lucide-react";
import { Marca } from "@/types/marca";

interface MarcasTableProps {
  data: Marca[];
  onEdit?: (marca: Marca) => void;
}

export function MarcasTable({ data, onEdit }: MarcasTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Fecha creación</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center">No hay marcas registradas.</TableCell>
          </TableRow>
        ) : (
          data.map((marca) => (
            <TableRow key={marca.id}>
              <TableCell>{marca.id}</TableCell>
              <TableCell>{new Date(marca.creado_el).toLocaleString()}</TableCell>
              <TableCell>{marca.descripcion}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onEdit?.(marca)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
} 