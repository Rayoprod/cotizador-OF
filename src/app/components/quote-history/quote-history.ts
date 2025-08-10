import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { PdfService } from '../../services/pdf';
import { CotizacionData, QuoteItem } from '../../models/cotizacion.model';

// Interfaz para la data que recibimos de la BD
export interface CotizacionGuardada {
  id: number;
  created_at: string;
  numero_cotizacion: string;
  cliente: string; // El nombre del cliente es un texto
  fecha: string;
  items: QuoteItem[]; // Los items vienen en el JSON
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

  async verPDF(cotizacion: CotizacionGuardada): Promise<void> {
    // La data ya viene en el formato correcto para el PDF, es más simple
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
    this.pdfService.generarCotizacionPDF(datosParaPDF);
  }
}
