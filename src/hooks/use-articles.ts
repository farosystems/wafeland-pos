import { useEffect, useState, useCallback } from "react";
import {
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
} from "@/app/actions/articles";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getArticles();
      setArticles(data);
    } catch (error) {
      console.error("Error al cargar artículos:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const addArticle = async (data: CreateArticleData) => {
    setLoading(true);
    setError(null);
    try {
      const newArticle = await createArticle(data);
      setArticles((prev) => [newArticle, ...prev]);
      // Refrescar la lista para obtener datos completos
      await fetchArticles();
    } catch (error) {
      console.error("Error al crear artículo:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const editArticle = async (id: number, data: UpdateArticleData) => {
    setLoading(true);
    setError(null);
    try {
      await updateArticle(id, data);
      // Refrescar la lista para obtener datos completos
      await fetchArticles();
    } catch (error) {
      console.error("Error al editar artículo:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const removeArticle = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deleteArticle(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error al eliminar artículo:", error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return {
    articles,
    loading,
    error,
    fetchArticles,
    addArticle,
    editArticle,
    removeArticle,
  };
} 