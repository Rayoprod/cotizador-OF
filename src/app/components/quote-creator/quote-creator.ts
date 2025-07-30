import { Component } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuoteItem {
  id: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

@Component({
  selector: 'app-quote-creator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe
  ],
  templateUrl: './quote-creator.html',
  styleUrls: ['./quote-creator.scss']
})
export class QuoteCreator { // <--- Nombre corregido
  numeroCotizacion: string = 'COT-2025-001';
  cliente: string = '';
  fecha: string = new Date().toLocaleDateString('es-PE');

  items: QuoteItem[] = [
    { id: 1, descripcion: 'Análisis y diagnóstico de sistema', cantidad: 1, precioUnitario: 50.00 }
  ];
  private nextId = 2;

  addItem(): void {
    this.items.push({
      id: this.nextId++,
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0
    });
  }

  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  get subtotal(): number {
    return this.items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
  }

  get igv(): number {
    return this.subtotal * 0.18;
  }

  get total(): number {
    return this.subtotal + this.igv;
  }

  private formatCurrency(value: number): string {
    const formatter = new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    });
    return formatter.format(value || 0).replace('PEN', 'S/ ');
  }

  generarPDF(): void {
    const doc = new jsPDF();
    const head = [['#', 'Descripción', 'Cant.', 'P. Unit.', 'Total']];
    const body = this.items.map((item, index) => [
      index + 1,
      item.descripcion,
      item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency(item.cantidad * item.precioUnitario)
    ]);

    autoTable(doc, {
      head: head,
      body: body,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [233, 236, 239], textColor: [33, 37, 41] },
      didDrawPage: (data: any) => {
        doc.setFontSize(22);
        doc.text("COTIZACIÓN", 195, 20, { align: 'right' });
        doc.setFontSize(12);
        doc.text(this.numeroCotizacion, 195, 28, { align: 'right' });
        doc.text("Tu Empresa S.A.C.", 15, 28);
        doc.line(15, 35, 195, 35);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("CLIENTE:", 15, 45);
        doc.setFont('helvetica', 'normal');
        doc.text(this.cliente, 40, 45);
        doc.setFont('helvetica', 'bold');
        doc.text("FECHA:", 140, 45);
        doc.setFont('helvetica', 'normal');
        doc.text(this.fecha, 160, 45);
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const summaryX = 130;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text("Subtotal:", summaryX, finalY + 10);
    doc.text(this.formatCurrency(this.subtotal), 195, finalY + 10, { align: 'right' });
    doc.text("IGV (18%):", summaryX, finalY + 17);
    doc.text(this.formatCurrency(this.igv), 195, finalY + 17, { align: 'right' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL:", summaryX, finalY + 25);
    doc.text(this.formatCurrency(this.total), 195, finalY + 25, { align: 'right' });

    doc.save(`Cotizacion-${this.numeroCotizacion}.pdf`);
  }
}
