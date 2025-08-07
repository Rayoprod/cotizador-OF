import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { PdfService } from '../../services/pdf';
import { CotizacionData, QuoteItem } from '../../models/cotizacion.model'; // <-- La importamos del nuevo lugar


export interface Cotizacion {
  id: number;
  created_at: string;
  numero_cotizacion: string;
  cliente: string;
  fecha: string;
  total: number;
  items: QuoteItem[]; // <-- Ahora usa la interfaz QuoteItem importada
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

  verPDF(cotizacion: any): void { // Usamos 'any' temporalmente para que acepte las nuevas propiedades
  const datosParaPDF: CotizacionData = {
    numeroCotizacion: cotizacion.numero_cotizacion,
    cliente: cotizacion.cliente,
    fecha: cotizacion.fecha,
    items: cotizacion.items,
    subtotal: cotizacion.subtotal,             // <-- USA EL VALOR GUARDADO
    igv: cotizacion.igv,                       // <-- USA EL VALOR GUARDADO
    total: cotizacion.total,
    incluirIGV: cotizacion.incluir_igv,         // <-- USA EL VALOR GUARDADO
    entregaEnObra: cotizacion.entrega_en_obra // <-- USA EL VALOR GUARDADO
  };

  this.pdfService.generarCotizacionPDF(datosParaPDF);
}
}
