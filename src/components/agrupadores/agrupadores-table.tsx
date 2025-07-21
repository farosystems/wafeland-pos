"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Agrupador } from "@/types/agrupador";
import { Edit } from "lucide-react";

interface AgrupadoresTableProps {
  data: Agrupador[];
  onEdit?: (agrupador: Agrupador) => void;
}

export function AgrupadoresTable({ data, onEdit }: AgrupadoresTableProps) {
  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? (
              data.map((agrupador) => (
                <TableRow key={agrupador.id} className="hover:bg-blue-50 transition-colors">
                  <TableCell>{agrupador.id}</TableCell>
                  <TableCell>{agrupador.nombre}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onEdit?.(agrupador)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No se encontraron agrupadores.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 