const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateStockFields() {
  try {
    console.log('Starting migration for stock_minimo and stock_maximo fields...');
    
    // Update all records where stock_minimo is null to 0
    const { data: updateMinimo, error: errorMinimo } = await supabase
      .from('variantes_articulos')
      .update({ stock_minimo: 0 })
      .is('stock_minimo', null);
    
    if (errorMinimo) {
      console.error('Error updating stock_minimo:', errorMinimo);
    } else {
      console.log(`Updated ${updateMinimo?.length || 0} records for stock_minimo`);
    }
    
    // Update all records where stock_maximo is null to 0
    const { data: updateMaximo, error: errorMaximo } = await supabase
      .from('variantes_articulos')
      .update({ stock_maximo: 0 })
      .is('stock_maximo', null);
    
    if (errorMaximo) {
      console.error('Error updating stock_maximo:', errorMaximo);
    } else {
      console.log(`Updated ${updateMaximo?.length || 0} records for stock_maximo`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateStockFields(); 