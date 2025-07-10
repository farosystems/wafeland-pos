import { supabase } from "@/lib/supabaseClient";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";

export async function getArticles() {
  const { data, error } = await supabase
    .from("articulos")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return data as Article[];
}

export async function createArticle(article: CreateArticleData) {
  const { data, error } = await supabase
    .from("articulos")
    .insert([article])
    .select()
    .single();
  if (error) throw error;
  return data as Article;
}

export async function updateArticle(id: number, article: UpdateArticleData) {
  const { data, error } = await supabase
    .from("articulos")
    .update(article)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Article;
}

export async function deleteArticle(id: number) {
  const { error } = await supabase.from("articulos").delete().eq("id", id);
  if (error) throw error;
} 