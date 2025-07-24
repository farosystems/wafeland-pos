"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MarcasTable } from "./marcas-table";
import { MarcaForm } from "./marca-form";
import { useMarcas } from "@/hooks/use-marcas";
import { Marca, CreateMarcaData, UpdateMarcaData } from "@/types/marca";

export function MarcasContent() {
  const {
    marcas,
    error,
    addMarca,
    editMarca,
  } = useMarcas();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingMarca, setEditingMarca] = React.useState<Marca | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);

  const openCreateDialog = () => {
    setEditingMarca(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (marca: Marca) => {
    setEditingMarca(marca);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMarca(undefined);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Marcas</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Marca
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]" preventOutsideClose>
            <DialogHeader>
              <DialogTitle>
                {editingMarca ? "Editar Marca" : "Nueva Marca"}
              </DialogTitle>
              <DialogDescription>
                {editingMarca
                  ? "Modifica la descripción de la marca."
                  : "Completa la información para crear una nueva marca."}
              </DialogDescription>
            </DialogHeader>
            <MarcaForm
              marca={editingMarca}
              onSubmit={async (data: CreateMarcaData | UpdateMarcaData) => {
                setIsLoading(true);
                if (editingMarca) {
                  const updateData: UpdateMarcaData = {};
                  if (typeof data.descripcion === 'string') updateData.descripcion = data.descripcion;
                  await editMarca(editingMarca.id, updateData);
                } else {
                  await addMarca({ descripcion: String((data as CreateMarcaData).descripcion) });
                }
                setIsLoading(false);
                closeDialog();
              }}
              onCancel={closeDialog}
              isLoading={isLoading}
            />
          </DialogContent>
        </Dialog>
      </div>
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      <div className="rounded-lg border bg-card">
        <MarcasTable data={marcas} onEdit={openEditDialog} />
      </div>
    </div>
  );
} 