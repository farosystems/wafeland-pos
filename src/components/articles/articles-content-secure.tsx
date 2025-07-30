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
import { useArticlesSecure } from "@/hooks/use-articles-secure";
import { useUser } from "@clerk/nextjs";
import { AgrupadoresContent } from "@/components/agrupadores/agrupadores-content";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";
import { MarcasContent } from "@/components/articles/marcas-content";
import { toast } from "sonner";

export function ArticlesContentSecure() {
  const { isSignedIn } = useUser();
  const {
    articles,
    loading,
    error,
    addArticle,
    editArticle,
    fetchArticles,
  } = useArticlesSecure();

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
        toast.success("Artículo actualizado correctamente");
      } else {
        await addArticle(data as CreateArticleData);
        toast.success("Artículo creado correctamente");
      }
      closeDialog();
    } catch (error) {
      console.error("Error al guardar artículo:", error);
      toast.error((error as Error).message || "Error al guardar artículo");
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar error si existe
  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-lg text-muted-foreground">Debes iniciar sesión para ver los artículos.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-8 mt-6">
            <div className="flex items-center mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold leading-tight">Gestión de Artículos</h1>
            <p className="text-muted-foreground text-base">Administra tu catálogo de productos y servicios.</p>
          </div>
        </div>
      </div>

      {/* Tabs para diferentes secciones */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Artículos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Artículos</h2>
                <ArticlesTable 
                  data={articles} 
                  onEdit={openEditDialog}
                  onNewArticle={openCreateDialog}
                />
              </div>
            </div>
          </div>

          {/* Marcas y Agrupadores */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <MarcasContent />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                <AgrupadoresContent />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog para crear/editar artículo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Editar Artículo" : "Nuevo Artículo"}
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