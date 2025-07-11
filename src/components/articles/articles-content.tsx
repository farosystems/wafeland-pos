"use client";

import * as React from "react";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArticlesTable } from "@/components/articles/articles-table";
import { ArticleForm } from "@/components/articles/article-form";
import { useArticles } from "@/hooks/use-articles";
import { useUser } from "@clerk/nextjs";
import { AgrupadoresContent } from "@/components/agrupadores/agrupadores-content";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";

export function ArticlesContent() {
  const { isSignedIn } = useUser();
  const {
    articles,
    error,
    addArticle,
    editArticle,
  } = useArticles();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingArticle, setEditingArticle] = React.useState<Article | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);

  const openCreateDialog = () => {
    setEditingArticle(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (article: Article) => {
    setEditingArticle(article);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingArticle(undefined);
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-lg text-muted-foreground">Debes iniciar sesión para ver los artículos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Artículos</h1>
            <p className="text-muted-foreground">
              Gestiona el inventario de productos
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingArticle ? "Editar Artículo" : "Nuevo Artículo"}
              </DialogTitle>
              <DialogDescription>
                {editingArticle
                  ? "Modifica la información del artículo seleccionado."
                  : "Completa la información para crear un nuevo artículo."}
              </DialogDescription>
            </DialogHeader>
            <ArticleForm
              article={editingArticle}
              onSubmit={async (data: CreateArticleData | UpdateArticleData) => {
                setIsLoading(true);
                if (editingArticle) {
                  // Solo pasa los campos requeridos si existen
                  const updateData: UpdateArticleData = {};
                  if (typeof data.descripcion === 'string') updateData.descripcion = data.descripcion;
                  if (typeof data.precio_unitario === 'number') updateData.precio_unitario = data.precio_unitario;
                  if (typeof data.fk_id_agrupador === 'number') updateData.fk_id_agrupador = data.fk_id_agrupador;
                  if (typeof data.activo === 'boolean') updateData.activo = data.activo;
                  if (typeof data.porcentaje_iva === 'number') updateData.porcentaje_iva = data.porcentaje_iva;
                  if (typeof data.stock === 'number') updateData.stock = data.stock;
                  await editArticle(editingArticle.id, updateData);
                } else {
                  // Forzar que los campos requeridos sean del tipo correcto
                  await addArticle({
                    descripcion: String((data as CreateArticleData).descripcion),
                    precio_unitario: Number((data as CreateArticleData).precio_unitario),
                    fk_id_agrupador: Number((data as CreateArticleData).fk_id_agrupador),
                    activo: Boolean((data as CreateArticleData).activo),
                    porcentaje_iva: Number((data as CreateArticleData).porcentaje_iva),
                    stock: Number((data as CreateArticleData).stock),
                  });
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
        <ArticlesTable data={articles} onEdit={openEditDialog} />
      </div>
      {/* Agrupadores debajo */}
      <AgrupadoresContent />
    </div>
  );
} 