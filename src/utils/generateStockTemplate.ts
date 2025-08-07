import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { Variante } from '@/types/variante';

interface ExcelRow {
  Variante: number;
  ID_Articulo: number;
  Descripcion_Articulo: string;
  ID_Talle: number;
  Descripcion_Talle: string;
  ID_Color: number;
  Descripcion_Color: string;
  Precio_Venta: number;
  Stock_Unitario: string | number;
  Stock_Minimo: string | number;
  Stock_Maximo: string | number;
}

export async function generateStockTemplate(variantes: Variante[]): Promise<void> {
  try {
    // Crear datos para el Excel con las columnas requeridas
    const excelData = variantes.map(variante => ({
      'Variante': variante.id,
      'ID_Articulo': variante.articulo_id || variante.fk_id_articulo,
      'Descripcion_Articulo': variante.articulo_descripcion,
      'ID_Talle': variante.talle_id || variante.fk_id_talle,
      'Descripcion_Talle': variante.talle_descripcion,
      'ID_Color': variante.color_id || variante.fk_id_color,
      'Descripcion_Color': variante.color_descripcion,
      'Precio_Venta': variante.precio_venta || 0,
      'Stock_Unitario': '', // Vacío para que el usuario complete
      'Stock_Minimo': '', // Vacío para que el usuario complete
      'Stock_Maximo': '', // Vacío para que el usuario complete
    }));

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar estilos para las columnas
    const columnWidths = [
      { wch: 12 }, // Variante
      { wch: 12 }, // ID_Articulo
      { wch: 30 }, // Descripcion_Articulo
      { wch: 12 }, // ID_Talle
      { wch: 15 }, // Descripcion_Talle
      { wch: 12 }, // ID_Color
      { wch: 15 }, // Descripcion_Color
      { wch: 15 }, // Precio_Venta
      { wch: 15 }, // Stock_Unitario
      { wch: 15 }, // Stock_Minimo
      { wch: 15 }, // Stock_Maximo
    ];

    worksheet['!cols'] = columnWidths;

    // Agregar el worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Stock');

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `plantilla_importacion_stock_${timestamp}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(workbook, fileName);

    console.log(`Plantilla Excel generada: ${fileName}`);
  } catch (error) {
    console.error('Error generando plantilla Excel:', error);
    throw new Error('No se pudo generar la plantilla Excel');
  }
}

export async function validateAndImportStock(excelFile: File, variantes: Variante[]): Promise<void> {
  try {
    // Leer el archivo Excel
    const arrayBuffer = await excelFile.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Obtener la primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
    
    if (jsonData.length === 0) {
      throw new Error('El archivo Excel está vacío');
    }

    // Validar estructura del archivo
    const requiredColumns = [
      'Variante', 'ID_Articulo', 'Descripcion_Articulo', 'ID_Talle', 
      'Descripcion_Talle', 'ID_Color', 'Descripcion_Color', 'Precio_Venta',
      'Stock_Unitario', 'Stock_Minimo', 'Stock_Maximo'
    ];

    const firstRow = jsonData[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      throw new Error(`Faltan las siguientes columnas: ${missingColumns.join(', ')}`);
    }

    // Validar y procesar cada fila
    const updates: Array<{
      id: number;
      stock_unitario: number;
      stock_minimo: number | null;
      stock_maximo: number | null;
    }> = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // +2 porque Excel empieza en 1 y la primera fila es el header

      // Validar que la variante existe
      const variante = variantes.find(v => v.id === row.Variante);
      if (!variante) {
        throw new Error(`Fila ${rowNumber}: La variante con ID ${row.Variante} no existe en la base de datos`);
      }

      // Validar y convertir valores de stock
      const stockUnitario = parseStockValue(row.Stock_Unitario, `Stock_Unitario en fila ${rowNumber}`, true);
      const stockMinimo = parseStockValue(row.Stock_Minimo, `Stock_Minimo en fila ${rowNumber}`, false);
      const stockMaximo = parseStockValue(row.Stock_Maximo, `Stock_Maximo en fila ${rowNumber}`, false);

      // stockUnitario nunca será null porque es requerido
      if (stockUnitario === null) {
        throw new Error(`Stock_Unitario en fila ${rowNumber}: El valor no puede estar vacío`);
      }

      // Validar que stock_minimo <= stock_unitario <= stock_maximo (solo si ambos valores están presentes)
      if (stockMinimo !== null && stockMinimo > stockUnitario) {
        throw new Error(`Fila ${rowNumber}: Stock_Minimo (${stockMinimo}) no puede ser mayor que Stock_Unitario (${stockUnitario})`);
      }
      if (stockMaximo !== null && stockMaximo < stockUnitario) {
        throw new Error(`Fila ${rowNumber}: Stock_Maximo (${stockMaximo}) no puede ser menor que Stock_Unitario (${stockUnitario})`);
      }

      updates.push({
        id: row.Variante,
        stock_unitario: stockUnitario,
        stock_minimo: stockMinimo,
        stock_maximo: stockMaximo,
      });
    }

    // Actualizar la base de datos - SUMAR stock en lugar de reemplazar
    for (const update of updates) {
      // Obtener el stock actual de la variante
      const { data: currentVariante, error: fetchError } = await supabase
        .from('variantes_articulos')
        .select('stock_unitario')
        .eq('id', update.id)
        .single();

      if (fetchError) {
        throw new Error(`Error obteniendo stock actual de variante ${update.id}: ${fetchError.message}`);
      }

      // Calcular el nuevo stock sumando el actual con el del Excel
      const currentStock = currentVariante?.stock_unitario || 0;
      const newStock = currentStock + update.stock_unitario;

      // Actualizar con el stock sumado
      const { error } = await supabase
        .from('variantes_articulos')
        .update({
          stock_unitario: newStock,
          stock_minimo: update.stock_minimo,
          stock_maximo: update.stock_maximo,
        })
        .eq('id', update.id);

      if (error) {
        throw new Error(`Error actualizando variante ${update.id}: ${error.message}`);
      }
    }

    console.log(`Stock importado exitosamente: ${updates.length} variantes actualizadas`);
  } catch (error) {
    console.error('Error validando e importando stock:', error);
    throw error;
  }
}

function parseStockValue(value: string | number, fieldName: string, required: boolean = true): number | null {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new Error(`${fieldName}: El valor no puede estar vacío`);
    } else {
      return null; // Permitir valores vacíos para campos opcionales
    }
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    throw new Error(`${fieldName}: El valor "${value}" no es un número válido`);
  }

  if (numValue < 0) {
    throw new Error(`${fieldName}: El valor no puede ser negativo`);
  }

  return Math.round(numValue); // Redondear a números enteros
} 