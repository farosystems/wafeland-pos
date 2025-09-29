import { supabase } from "@/lib/supabaseClient";
import { Article, CreateArticleData, UpdateArticleData } from "@/types/article";

export async function getArticles() {
  const { data, error } = await supabase
    .from("articulos")
    .select(`*, fk_id_marca, fk_id_agrupador, equivalencia, es_combo`)
    .order("id", { ascending: false });
  if (error) throw error;

  // Traer todas las marcas y agrupadores para mapear manualmente
  const { data: marcas } = await supabase.from("marcas").select("id, descripcion");
  const { data: agrupadores } = await supabase.from("agrupadores").select("id, nombre");

  // Traer componentes de combos
  const { data: componentesCombo } = await supabase
    .from("articulos_combo_detalle")
    .select(`
      *,
      articulos!fk_articulo_componente(
        id,
        descripcion,
        stock,
        precio_unitario
      )
    `);

  // Mapear nombres/descripciones de foráneas
  const mapped = (data as unknown[]).map(a => {
    const marca = marcas?.find((m: any) => m.id === (a as any).fk_id_marca);
    const agrupador = agrupadores?.find((g: any) => g.id === (a as any).fk_id_agrupador);
    const componentes = componentesCombo?.filter((c: any) => c.fk_articulo_combo === (a as any).id) || [];

    return {
      ...(a as Record<string, unknown>),
      marca_nombre: marca?.descripcion || '-',
      agrupador_nombre: agrupador?.nombre || '-',
      componentes: componentes.map((c: any) => ({
        id: c.id,
        fk_articulo_combo: c.fk_articulo_combo,
        fk_articulo_componente: c.fk_articulo_componente,
        cantidad: c.cantidad,
        created_at: c.created_at,
        articulo_componente: c.articulos ? {
          id: c.articulos.id,
          descripcion: c.articulos.descripcion,
          stock: c.articulos.stock,
          precio_unitario: c.articulos.precio_unitario
        } : undefined
      }))
    };
  });
  return mapped as Article[];
}

export async function createArticle(article: CreateArticleData) {
  console.log('createArticle llamado con:', article);
  const { componentes, ...articleData } = article;

  const { data, error } = await supabase
    .from("articulos")
    .insert([articleData])
    .select()
    .single();
  if (error) throw error;

  console.log('Artículo creado:', data);
  console.log('Es combo:', article.es_combo);
  console.log('Componentes:', componentes);

  // Si es un combo y tiene componentes, insertarlos
  if (article.es_combo && componentes && componentes.length > 0) {
    console.log('Insertando componentes del combo...');
    const componentesData = componentes.map(comp => ({
      fk_articulo_combo: data.id,
      fk_articulo_componente: comp.fk_articulo_componente,
      cantidad: comp.cantidad
    }));

    console.log('Datos de componentes a insertar:', componentesData);

    const { error: componentesError } = await supabase
      .from("articulos_combo_detalle")
      .insert(componentesData);

    if (componentesError) {
      console.error('Error al insertar componentes:', componentesError);
      // Si falla la inserción de componentes, eliminar el artículo creado
      await supabase.from("articulos").delete().eq("id", data.id);
      throw componentesError;
    }
    console.log('Componentes insertados exitosamente');
  } else {
    console.log('No se insertaron componentes. Es combo:', article.es_combo, 'Componentes length:', componentes?.length);
  }

  return data as Article;
}

export async function updateArticle(id: number, article: UpdateArticleData) {
  const { componentes, ...articleData } = article;

  const { data, error } = await supabase
    .from("articulos")
    .update(articleData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // Si es un combo, actualizar los componentes
  if (article.es_combo !== undefined) {
    // Primero eliminar todos los componentes existentes
    await supabase
      .from("articulos_combo_detalle")
      .delete()
      .eq("fk_articulo_combo", id);

    // Si es combo y tiene componentes, insertarlos
    if (article.es_combo && componentes && componentes.length > 0) {
      const componentesData = componentes.map(comp => ({
        fk_articulo_combo: id,
        fk_articulo_componente: comp.fk_articulo_componente,
        cantidad: comp.cantidad
      }));

      const { error: componentesError } = await supabase
        .from("articulos_combo_detalle")
        .insert(componentesData);

      if (componentesError) throw componentesError;
    }
  }

  return data as Article;
}

export async function deleteArticle(id: number) {
  const { error } = await supabase.from("articulos").delete().eq("id", id);
  if (error) throw error;
} 