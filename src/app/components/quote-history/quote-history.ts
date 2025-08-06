import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // --- NUEVA FUNCIÓN PARA VER EL PDF ---
  verPDF(cotizacion: Cotizacion): void {
    const doc = new jsPDF();
    const head = [['#', 'Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Total']];
    const body = cotizacion.items.map((item, index) => [
      index + 1,
      item.descripcion,
      item.unidad,
      item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))
    ]);

    autoTable(doc, {
      head: head, body: body,
      margin: { top: 70, bottom: 60 },
      theme: 'grid',
      didDrawPage: (data: any) => {
        // Aquí puedes recrear el mismo encabezado y pie de página que en el cotizador
        // Por ahora lo dejaremos simple
        doc.setFontSize(20);
        doc.text('COTIZACIÓN', 195, 20, { align: 'right' });
        doc.setFontSize(11);
        doc.text(cotizacion.numero_cotizacion, 195, 27, { align: 'right' });
      },
    });

    // Abrir el PDF en una nueva pestaña
    doc.output('dataurlnewwindow');
  }

  private formatCurrency(value: number | null): string {
    const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    return formatter.format(value || 0).replace('PEN', 'S/ ');
  }
}
