import { supabase } from "@/lib/supabaseClient";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";

export async function getArticles() {
  const { data, error } = await supabase
    .from("articulos")
    .select(`*, fk_id_marca, fk_id_agrupador`)
    .order("id", { ascending: false });
  if (error) throw error;

  // Traer todas las marcas y agrupadores para mapear manualmente
  const { data: marcas } = await supabase.from("marcas").select("id, descripcion");
  const { data: agrupadores } = await supabase.from("agrupadores").select("id, nombre");

  // Mapear nombres/descripciones de foráneas
  const mapped = (data as unknown[]).map(a => {
    const marca = marcas?.find((m: any) => m.id === (a as any).fk_id_marca);
    const agrupador = agrupadores?.find((g: any) => g.id === (a as any).fk_id_agrupador);
    return {
      ...(a as Record<string, unknown>),
      marca_nombre: marca?.descripcion || '-',
      agrupador_nombre: agrupador?.nombre || '-',
    };
  });
  return mapped as Article[];
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