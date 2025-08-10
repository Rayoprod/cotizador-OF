import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { PdfService } from '../../services/pdf';
import { CotizacionData } from '../../models/cotizacion.model';

// Definimos una interfaz para la data que recibimos
export interface CotizacionCompleta {
  id: number;
  created_at: string;
  numero_cotizacion: string;
  total: number;
  subtotal: number;
  igv: number;
  incluir_igv: boolean;
  entrega_en_obra: boolean;
  fecha: string;
  clientes: { // Objeto de cliente anidado
    nombres: string;
    apellido_paterno: string;
    razon_social: string;
  } | null; // Puede ser nulo si el cliente fue borrado
  cotizacion_items: { // Array de items anidado
    cantidad: number;
    precio_unitario_cotizado: number;
    productos: { // Objeto de producto anidado
      descripcion: string;
      unidad: string;
    } | null; // Puede ser nulo si el producto fue borrado
  }[];
}

@Component({
  selector: 'app-quote-history',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './quote-history.html',
  styleUrls: ['./quote-history.scss']
})
export class QuoteHistoryComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private pdfService = inject(PdfService);
  public cotizaciones: CotizacionCompleta[] = [];
  public isLoading: boolean = true;

  ngOnInit(): void {
    this.getCotizaciones();
  }

  async getCotizaciones(): Promise<void> {
    this.isLoading = true;
    const data = await this.supabaseService.fetchCotizaciones();
    if (data) {
      this.cotizaciones = data as CotizacionCompleta[];
    }
    this.isLoading = false;
  }

  // ESTA ES LA FUNCIÓN QUE FALTABA EN TU ARCHIVO
  formatCliente(cliente: CotizacionCompleta['clientes']): string {
    if (!cliente) return 'Cliente Eliminado';
    return cliente.razon_social || `${cliente.nombres || ''} ${cliente.apellido_paterno || ''}`.trim();
  }

  verPDF(cotizacion: CotizacionCompleta): void {
    // Reconstruimos la data para el PDF desde la nueva estructura
    const datosParaPDF: CotizacionData = {
      numeroCotizacion: cotizacion.numero_cotizacion,
      cliente: this.formatCliente(cotizacion.clientes),
      fecha: cotizacion.fecha,
      items: cotizacion.cotizacion_items.map(item => ({
        id: 0,
        producto_id: null,
        descripcion: item.productos?.descripcion || 'Producto Eliminado',
        unidad: item.productos?.unidad || '-',
        cantidad: item.cantidad,
        precioUnitario: item.precio_unitario_cotizado,
      })),
      subtotal: cotizacion.subtotal,
      igv: cotizacion.igv,
      total: cotizacion.total,
      incluirIGV: cotizacion.incluir_igv,
      entregaEnObra: cotizacion.entrega_en_obra
    };

    this.pdfService.generarCotizacionPDF(datosParaPDF);
  }
}
