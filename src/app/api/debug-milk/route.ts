import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orden_id, articulo_id, cantidad, equivalencia_ml } = body;

    console.log('🥛 DEBUG: Procesando consumo manual:', {
      orden_id,
      articulo_id,
      cantidad,
      equivalencia_ml
    });

    // Verificar que la función existe
    const { data: functionExists } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'procesar_consumo_leche');

    if (!functionExists || functionExists.length === 0) {
      return NextResponse.json({
        error: 'La función procesar_consumo_leche no existe',
        success: false
      });
    }

    // Llamar a la función
    const { data, error } = await supabase.rpc('procesar_consumo_leche', {
      p_orden_id: orden_id,
      p_articulo_id: articulo_id,
      p_cantidad: cantidad,
      p_equivalencia_ml: equivalencia_ml
    });

    if (error) {
      console.error('🥛 ERROR en función:', error);
      return NextResponse.json({
        error: error.message,
        success: false,
        details: error
      });
    }

    // Verificar resultados
    const { data: consumoData } = await supabase
      .from('consumo_leche')
      .select('*')
      .eq('fk_id_orden', orden_id);

    const { data: controlData } = await supabase
      .from('control_ml_leche')
      .select('*');

    return NextResponse.json({
      success: true,
      function_result: data,
      consumo_records: consumoData,
      control_records: controlData
    });

  } catch (error) {
    console.error('🥛 ERROR GENERAL:', error);
    return NextResponse.json({
      error: 'Error general',
      details: error instanceof Error ? error.message : String(error),
      success: false
    });
  }
}

export async function GET() {
  try {
    // Verificar estado del sistema
    const { data: tablas } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['consumo_leche', 'control_ml_leche']);

    const { data: funcion } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'procesar_consumo_leche');

    const { data: articulos } = await supabase
      .from('articulos')
      .select('id, descripcion, equivalencia, stock')
      .gt('equivalencia', 0);

    const { data: leche } = await supabase
      .from('articulos')
      .select('id, descripcion, equivalencia, stock')
      .eq('equivalencia', 1000);

    const { data: consumoCount } = await supabase
      .from('consumo_leche')
      .select('id', { count: 'exact' });

    return NextResponse.json({
      tablas_existentes: tablas?.map(t => t.table_name) || [],
      funcion_existe: (funcion?.length ?? 0) > 0,
      articulos_con_equivalencia: articulos || [],
      articulo_leche: leche || [],
      total_consumos: consumoCount || 0
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Error al verificar sistema',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}