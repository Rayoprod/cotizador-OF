import { Component, inject, OnInit, TemplateRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import { PdfService } from '../../services/pdf';
import { CotizacionData, QuoteItem } from '../../models/cotizacion.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// INTERFAZ CORREGIDA Y COMPLETA
export interface CotizacionGuardada {
  id: number;
  created_at: string;
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
  private modalService = inject(NgbModal);

  public cotizaciones: CotizacionGuardada[] = [];
  public isLoading: boolean = true;
  public cotizacionSeleccionada: CotizacionGuardada | null = null;

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

  async revisarPDFHistorial(cotizacion: CotizacionGuardada, confirmationModal: TemplateRef<any>): Promise<void> {
    const datosParaPreview: CotizacionData = {
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
    const doc = this.pdfService.crearInstanciaPDF(datosParaPreview);

    const pdfBlob = doc.output('blob');
    window.open(URL.createObjectURL(pdfBlob));

    this.cotizacionSeleccionada = cotizacion;
    this.modalService.open(confirmationModal, { centered: true });
  }

  async generarPDFDesdeHistorial(): Promise<void> {
    if (!this.cotizacionSeleccionada) return;

    const cotizacion = this.cotizacionSeleccionada;

    const datosParaPDF_final: CotizacionData = {
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

    const docFinal = this.pdfService.crearInstanciaPDF(datosParaPDF_final);

    if (navigator.share) {
      const blob = docFinal.output('blob');
      const file = new File([blob], `Cotizacion-${cotizacion.numero_cotizacion}.pdf`, { type: 'application/pdf' });
      await navigator.share({ files: [file], title: `Cotización ${cotizacion.numero_cotizacion}` });
    } else {
      docFinal.output('dataurlnewwindow');
    }

    this.modalService.dismissAll();
    this.cotizacionSeleccionada = null;
  }
}
