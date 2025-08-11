"use client";

import * as React from "react";
import { Package, AlertTriangle } from "lucide-react";
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
import { getUsuarios } from "@/services/usuarios";
import { AgrupadoresContent } from "@/components/agrupadores/agrupadores-content";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";
import { MarcasContent } from "@/components/articles/marcas-content";
import { toast } from "sonner";

export function ArticlesContentSecure() {
  const { isSignedIn, user } = useUser();
  const {
    articles,
    error,
    addArticle,
    editArticle,
  } = useArticlesSecure();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingArticle, setEditingArticle] = React.useState<Article | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPermErrorModal, setShowPermErrorModal] = React.useState(false);
  const [permErrorMsg, setPermErrorMsg] = React.useState("");
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [userRole, setUserRole] = React.useState<string | null>(null);

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
        setSuccessMsg("Artículo generado correctamente");
        setShowSuccessModal(true);
      }
      closeDialog();
    } catch (error) {
      console.error("Error al guardar artículo:", error);
      const msg = (error as Error).message || "Error al guardar artículo";
      
      // Detectar errores de permisos de manera más específica
      const isPermissionError = 
        msg.includes("No tienes permisos para crear artículos") ||
        msg.includes("No tienes permisos para actualizar artículos") ||
        (userRole && userRole !== 'admin' && userRole !== 'supervisor' && 
         msg.includes("Server Components render"));
      
      if (isPermissionError) {
        setPermErrorMsg("No tienes permisos para gestionar artículos. Solo administradores y supervisores pueden crear/editar artículos.");
        setShowPermErrorModal(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener el rol del usuario actual
  React.useEffect(() => {
    const getUserRole = async () => {
      try {
        const usuarios = await getUsuarios();
        const currentUser = usuarios.find(u => u.email === user?.emailAddresses[0]?.emailAddress);
        if (currentUser) {
          setUserRole(currentUser.rol);
        }
      } catch (error) {
        console.error("Error al obtener rol del usuario:", error);
      }
    };

    if (user?.emailAddresses[0]?.emailAddress) {
      getUserRole();
    }
  }, [user]);

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
        {/* Artículos */}
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

        {/* Marcas y Agrupadores debajo de Artículos */}
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

      {/* Dialog para crear/editar artículo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
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

      <Dialog open={showPermErrorModal} onOpenChange={setShowPermErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error de Permisos
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {permErrorMsg}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Tu rol actual:</strong> {userRole || 'No determinado'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Roles permitidos:</strong> Administrador, Supervisor
            </p>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => setShowPermErrorModal(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de éxito */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Package className="h-5 w-5" />
              ¡Artículo Creado!
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {successMsg}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => setShowSuccessModal(false)}
              className="bg-green-600 hover:bg-green-700"
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 