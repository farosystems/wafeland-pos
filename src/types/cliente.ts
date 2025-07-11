export interface Cliente {
  id: number;
  razon_social: string;
  tipo: "cliente" | "proveedor";
  email: string;
  tipo_doc: "dni" | "cuit" | "cuil";
  num_doc: string;
  telefono: string;
  categoria_iva:
    | "Consumidor Final"
    | "Responsable Inscripto"
    | "Responsable Monotributo"
    | "Exento"
    | "No Responsable"
    | "Sujeto no Categorizado";
}

export interface CreateClienteData extends Omit<Cliente, "id"> {
  // Add specific properties here if needed
} 