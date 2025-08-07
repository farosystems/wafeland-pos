"use client";

import * as React from "react";
import { Plus, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArticlesTable } from "@/components/articles/articles-table";
import { ArticleForm } from "@/components/articles/article-form";
import { useArticles } from "@/hooks/use-articles";
import { useUser } from "@clerk/nextjs";
import { AgrupadoresContent } from "@/components/agrupadores/agrupadores-content";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";
import { MarcasContent } from "@/components/articles/marcas-content";

export function ArticlesContent() {
  const { isSignedIn } = useUser();
  const {
    articles,
    loading,
    error,
    addArticle,
    editArticle,
    fetchArticles,
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

  const handleSave = async (data: CreateArticleData | UpdateArticleData) => {
    setIsLoading(true);
    try {
      if (editingArticle) {
        await editArticle(editingArticle.id, data as UpdateArticleData);
      } else {
        await addArticle(data as CreateArticleData);
      }
      closeDialog();
    } catch (error) {
      console.error("Error al guardar artículo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-lg text-muted-foreground">Debes iniciar sesión para ver los artículos.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-8 mt-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Gestión de Artículos</h1>
            <p className="text-muted-foreground text-base">Administra tu catálogo de productos y servicios.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchArticles}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refrescar"}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo artículo
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando artículos...</span>
        </div>
      )}

      {!loading && (
        <>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {/* Tabla de Artículos */}
          <div className="rounded-lg border bg-card p-4 mb-8">
            <ArticlesTable data={articles} onEdit={openEditDialog} />
          </div>

          {/* Tablas de Agrupadores y Marcas debajo de Artículos */}
          <div className="space-y-8">
            <div className="rounded-lg border bg-card p-4">
              <AgrupadoresContent />
            </div>
            <div className="rounded-lg border bg-card p-4">
              <MarcasContent />
            </div>
          </div>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" preventOutsideClose>
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Editar artículo" : "Nuevo artículo"}
            </DialogTitle>
            <DialogDescription>
              {editingArticle 
                ? "Modifica los datos del artículo seleccionado."
                : "Completa los datos para crear un nuevo artículo."
              }
            </DialogDescription>
          </DialogHeader>
          <ArticleForm
            article={editingArticle}
            onSave={handleSave}
            onCancel={closeDialog}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 