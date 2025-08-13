import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { Article } from '@/types/article';

interface ExcelRow {
  ID_Articulo: number;
  Descripcion_Articulo: string;
  Precio_Unitario: number;
  Stock: string | number;
}

export async function generateStockTemplate(articulos: Article[]): Promise<void> {
  try {
    // Crear datos para el Excel con las columnas requeridas
    const excelData = articulos.map(articulo => ({
      'ID_Articulo': articulo.id,
      'Descripcion_Articulo': articulo.descripcion,
      'Precio_Unitario': articulo.precio_unitario || 0,
      'Stock': '', // Vacío para que el usuario complete
    }));

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Configurar estilos para las columnas
    const columnWidths = [
      { wch: 12 }, // ID_Articulo
      { wch: 40 }, // Descripcion_Articulo
      { wch: 15 }, // Precio_Unitario
      { wch: 15 }, // Stock
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

export async function validateAndImportStock(excelFile: File, articulos: Article[]): Promise<void> {
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
      'ID_Articulo', 'Descripcion_Articulo', 'Precio_Unitario', 'Stock'
    ];

    const firstRow = jsonData[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      throw new Error(`Faltan las siguientes columnas: ${missingColumns.join(', ')}`);
    }

    // Validar y procesar cada fila
    const updates: Array<{
      id: number;
      stock: number;
    }> = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // +2 porque Excel empieza en 1 y la primera fila es el header

      // Validar que el artículo existe
      const articulo = articulos.find(a => a.id === row.ID_Articulo);
      if (!articulo) {
        throw new Error(`Fila ${rowNumber}: El artículo con ID ${row.ID_Articulo} no existe en la base de datos`);
      }

      // Validar y convertir valores de stock
      const stock = parseStockValue(row.Stock, `Stock en fila ${rowNumber}`, true);

      // stock nunca será null porque es requerido
      if (stock === null) {
        throw new Error(`Stock en fila ${rowNumber}: El valor no puede estar vacío`);
      }

      updates.push({
        id: row.ID_Articulo,
        stock: stock,
      });
    }

    // Actualizar la base de datos - SUMAR stock en lugar de reemplazar
    for (const update of updates) {
      // Obtener el stock actual del artículo
      const { data: currentArticulo, error: fetchError } = await supabase
        .from('articulos')
        .select('stock')
        .eq('id', update.id)
        .single();

      if (fetchError) {
        throw new Error(`Error obteniendo stock actual del artículo ${update.id}: ${fetchError.message}`);
      }

      // Calcular el nuevo stock sumando el actual con el del Excel
      const currentStock = currentArticulo?.stock || 0;
      const newStock = currentStock + update.stock;

      // Actualizar con el stock sumado
      const { error } = await supabase
        .from('articulos')
        .update({
          stock: newStock,
        })
        .eq('id', update.id);

      if (error) {
        throw new Error(`Error actualizando artículo ${update.id}: ${error.message}`);
      }
    }

    console.log(`Stock importado exitosamente: ${updates.length} artículos actualizados`);
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