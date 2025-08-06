import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { PdfService, CotizacionData } from '../../services/pdf';

export interface QuoteItem {
  id: number;
  descripcion: string;
  unidad: string;
  cantidad: number | null;
  precioUnitario: number | null;
}

export interface Cotizacion {
  id: number;
  created_at: string;
  numero_cotizacion: string;
  cliente: string;
  fecha: string;
  total: number;
  items: QuoteItem[];
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
  public cotizaciones: Cotizacion[] = [];
  public isLoading: boolean = true;

  ngOnInit(): void {
    this.getCotizaciones();
  }

  async getCotizaciones(): Promise<void> {
    this.isLoading = true;
    const data = await this.supabaseService.fetchCotizaciones();
    if (data) {
      this.cotizaciones = data as Cotizacion[];
    }
    this.isLoading = false;
  }

  verPDF(cotizacion: Cotizacion): void {
    const subtotal = cotizacion.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
    // Asumimos que si el total es mayor que el subtotal, entonces tenía IGV.
    const incluirIGV = cotizacion.total > subtotal;
    const igv = incluirIGV ? subtotal * 0.18 : 0;

    const datosParaPDF: CotizacionData = {
      numeroCotizacion: cotizacion.numero_cotizacion,
      cliente: cotizacion.cliente,
      fecha: cotizacion.fecha,
      items: cotizacion.items,
      subtotal: subtotal,
      igv: igv,
      total: cotizacion.total,
      incluirIGV: incluirIGV,
      entregaEnObra: false // Asumimos un valor por defecto al reimprimir, esto podría mejorarse en el futuro.
    };

    this.pdfService.generarCotizacionPDF(datosParaPDF);
  }
}
