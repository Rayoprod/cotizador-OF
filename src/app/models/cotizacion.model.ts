// Define los ingredientes de cada línea de la cotización
export interface QuoteItem {
  id: number;
  descripcion: string;
  unidad: string;
  cantidad: number | null;
  precioUnitario: number | null;
  producto_id: string | null; // <-- AÑADE ESTA PROPIEDAD

}

// Define todos los ingredientes para el PDF completo
export interface CotizacionData {
  numeroCotizacion: string;
  cliente: string;
  fecha: string;
  items: QuoteItem[];
  subtotal: number;
  igv: number;
  total: number;
  incluirIGV: boolean;
  entregaEnObra: boolean;
}
