import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { PdfService } from '../../services/pdf';
import { CotizacionData, QuoteItem } from '../../models/cotizacion.model';

// Interfaz que coincide con la tabla 'cotizaciones'
export interface CotizacionGuardada {
  id: number;
  numero_cotizacion: string;
  cliente: string;
  fecha: string;
  items: QuoteItem[];
  total: number;
  subtotal: number;
  igv: number;
  incluir_igv: boolean;
  entrega_en_obra: boolean;
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
  public cotizaciones: CotizacionGuardada[] = [];
  public isLoading: boolean = true;

  ngOnInit(): void {
    this.getCotizaciones();
  }

  async getCotizaciones(): Promise<void> {
    this.isLoading = true;
    const data = await this.supabaseService.fetchCotizaciones();
    if (data) {
      this.cotizaciones = data as CotizacionGuardada[];
    }
    this.isLoading = false;
  }

  // ESTA FUNCIÓN SOLO ABRE LA PREVISUALIZACIÓN
  async verPDF(cotizacion: CotizacionGuardada): Promise<void> {
    const datosParaPDF: CotizacionData = {
      numeroCotizacion: cotizacion.numero_cotizacion,
      cliente: cotizacion.cliente,
      fecha: cotizacion.fecha,
      items: cotizacion.items,
      subtotal: cotizacion.subtotal,
      igv: cotizacion.igv,
      total: cotizacion.total,
      incluirIGV: cotizacion.incluir_igv,
      entregaEnObra: cotizacion.entrega_en_obra
    };

    await this.pdfService.cargarFirma();
    const doc = this.pdfService.crearInstanciaPDF(datosParaPDF);

    // Abrimos la previsualización en una nueva pestaña de forma segura
    const pdfBlob = doc.output('blob');
    window.open(URL.createObjectURL(pdfBlob));
  }

  // ESTA FUNCIÓN SOLO COMPARTE
  async compartirPDF(cotizacion: CotizacionGuardada): Promise<void> {
    const datosParaPDF: CotizacionData = {
      numeroCotizacion: cotizacion.numero_cotizacion,
      cliente: cotizacion.cliente,
      fecha: cotizacion.fecha,
      items: cotizacion.items,
      subtotal: cotizacion.subtotal,
      igv: cotizacion.igv,
      total: cotizacion.total,
      incluirIGV: cotizacion.incluir_igv,
      entregaEnObra: cotizacion.entrega_en_obra
    };

    const docFinal = this.pdfService.crearInstanciaPDF(datosParaPDF);
    const blob = docFinal.output('blob');
    const file = new File([blob], `Cotizacion-${cotizacion.numero_cotizacion}.pdf`, { type: 'application/pdf' });

    try {
      await navigator.share({
        title: `Cotización ${cotizacion.numero_cotizacion}`,
        files: [file],
      });
    } catch (error) {
      console.error('Error al compartir:', error);
    }
  }

  public isMobile(): boolean {
    return !!navigator.share;
  }
}
