const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplaza con tus credenciales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupNotaCredito() {
  try {
    console.log('🔍 Verificando tipos de comprobantes existentes...');
    
    // Obtener tipos de comprobantes existentes
    const { data: tiposExistentes, error: errorConsulta } = await supabase
      .from('tipos_comprobantes')
      .select('*')
      .order('id', { ascending: true });
    
    if (errorConsulta) {
      throw new Error(`Error al consultar tipos de comprobantes: ${errorConsulta.message}`);
    }
    
    console.log('📋 Tipos de comprobantes encontrados:');
    tiposExistentes.forEach(tipo => {
      console.log(`  - ID: ${tipo.id}, Descripción: "${tipo.descripcion}"`);
    });
    
    // Verificar si ya existe "NOTA DE CREDITO"
    const notaCreditoExistente = tiposExistentes.find(tipo => 
      tipo.descripcion.toUpperCase().includes('NOTA DE CREDITO') ||
      tipo.descripcion.toUpperCase().includes('NOTA DE CRÉDITO')
    );
    
    if (notaCreditoExistente) {
      console.log(`✅ Tipo de comprobante "NOTA DE CREDITO" ya existe con ID: ${notaCreditoExistente.id}`);
      return;
    }
    
    console.log('➕ Creando tipo de comprobante "NOTA DE CREDITO"...');
    
    // Crear el tipo de comprobante "NOTA DE CREDITO"
    const { data: nuevoTipo, error: errorCreacion } = await supabase
      .from('tipos_comprobantes')
      .insert([{
        descripcion: 'NOTA DE CREDITO',
        descuenta_stock: false,
        reingresa_stock: true,
        admite_impuestos: true,
        imprime_pdf: true,
        activo: true
      }])
      .select()
      .single();
    
    if (errorCreacion) {
      throw new Error(`Error al crear tipo de comprobante: ${errorCreacion.message}`);
    }
    
    console.log(`✅ Tipo de comprobante "NOTA DE CREDITO" creado exitosamente con ID: ${nuevoTipo.id}`);
    
    // Verificar que se creó correctamente
    const { data: tipoVerificado, error: errorVerificacion } = await supabase
      .from('tipos_comprobantes')
      .select('*')
      .eq('id', nuevoTipo.id)
      .single();
    
    if (errorVerificacion) {
      throw new Error(`Error al verificar tipo creado: ${errorVerificacion.message}`);
    }
    
    console.log('📋 Detalles del tipo creado:');
    console.log(`  - ID: ${tipoVerificado.id}`);
    console.log(`  - Descripción: "${tipoVerificado.descripcion}"`);
    console.log(`  - Descuenta stock: ${tipoVerificado.descuenta_stock ? 'Sí' : 'No'}`);
    console.log(`  - Reingresa stock: ${tipoVerificado.reingresa_stock ? 'Sí' : 'No'}`);
    console.log(`  - Admite impuestos: ${tipoVerificado.admite_impuestos ? 'Sí' : 'No'}`);
    console.log(`  - Imprime PDF: ${tipoVerificado.imprime_pdf ? 'Sí' : 'No'}`);
    console.log(`  - Activo: ${tipoVerificado.activo ? 'Sí' : 'No'}`);
    
    console.log('\n🎉 Configuración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar el script
setupNotaCredito(); 