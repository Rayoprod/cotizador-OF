import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ToastService } from '../../services/toast';

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
  private toastService = inject(ToastService);
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

  private formatCurrency(value: number | null): string {
    const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    return formatter.format(value || 0).replace('PEN', 'S/ ');
  }

  // Lógica para recrear el PDF a partir de datos guardados
  async verPDF(cotizacion: Cotizacion): Promise<void> {
    const doc = new jsPDF();
    const head = [['#', 'Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Total']];
    const body = cotizacion.items.map((item, index) => [
      index + 1, item.descripcion, item.unidad, item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))
    ]);

    const clienteYPosition = 62;
    const clienteMaxWidth = 95;
    const clienteTextLines = doc.splitTextToSize(cotizacion.cliente, clienteMaxWidth);
    const clienteTextHeight = clienteTextLines.length * 5;
    const tableStartY = clienteYPosition + clienteTextHeight + 8;

    autoTable(doc, {
      head: head, body: body,
      startY: tableStartY,
      margin: { bottom: 60 },
      theme: 'grid',
      headStyles: { fillColor: [233, 236, 239], textColor: [33, 37, 41] },
      didDrawPage: (data: any) => {
        const leftMargin = 15;
        const rightMargin = 195;
        const primaryColor = '#212529';
        const secondaryColor = '#6c757d';
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('ELECTROFERRETERO "W&M"', leftMargin, 15);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(primaryColor);
        doc.text('DE: MARIA LUZ MITMA TORRES', leftMargin, 20);
        let currentY = 25;
        const servicesText = 'ALQUILER DE MAQUINARIA, VENTA DE AGREGADOS DE CONSTRUCCIÓN, CARPINTERÍA, PREFABRICADOS, MATERIALES ELÉCTRICOS Y SERVICIOS GENERALES PARA: PROYECTOS CIVILES, ELECTROMECÁNICOS, CARPINTERÍA Y SERVICIOS EN GENERAL, INSTALACIONES ELÉCTRICAS EN MEDIA Y BAJA TENSIÓN, EN PLANTAS MINERAS, EN LOCALES COMERCIALES E INDUSTRIALES, COMUNICACIONES, ILUMINACIÓN DE CAMPOS DEPORTIVOS, INSTALACIÓN DE TABLEROS ELÉCTRICOS DOMÉSTICOS E INDUSTRIALES';
        doc.setFontSize(7); doc.setTextColor(secondaryColor);
        doc.text(servicesText, leftMargin, currentY, { maxWidth: 110, lineHeightFactor: 1.4 });
        doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('COTIZACIÓN', rightMargin, 20, { align: 'right' });
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(secondaryColor);
        doc.text(cotizacion.numero_cotizacion, rightMargin, 27, { align: 'right' });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('R.U.C. Nº 10215770635', rightMargin, 34, { align: 'right' });
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('CALLE LOS SAUCES Mz. 38 LT. 12 - CHALA - CARAVELI - AREQUIPA', 15, 48);
        doc.line(15, 55, 195, 55);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text("CLIENTE:", 15, clienteYPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(clienteTextLines, 40, clienteYPosition);
        doc.setFont('helvetica', 'bold');
        doc.text("FECHA:", 140, clienteYPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(cotizacion.fecha, 160, clienteYPosition);

        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const pageCount = (doc as any).internal.getNumberOfPages();
        let footerY = pageHeight - 55;
        // ... (resto del pie de página)
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const subtotal = cotizacion.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
    const igv = subtotal * 0.18; // Asumimos que si se guardó con IGV, lo mostramos
    const total = cotizacion.total;

    const summaryX = 130;
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text("Subtotal:", summaryX, finalY + 10); doc.text(this.formatCurrency(subtotal), 195, finalY + 10, { align: 'right' });
    doc.text("IGV (18%):", summaryX, finalY + 17); doc.text(this.formatCurrency(igv), 195, finalY + 17, { align: 'right' });
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text("TOTAL:", summaryX, finalY + 25); doc.text(this.formatCurrency(total), 195, finalY + 25, { align: 'right' });

    // Abre el PDF en una nueva pestaña
    doc.output('dataurlnewwindow');
  }
}
