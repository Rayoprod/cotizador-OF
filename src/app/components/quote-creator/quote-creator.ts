import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ToastService } from '../../services/toast';

// INTERFAZ ACTUALIZADA
export interface QuoteItem {
  id: number;
  descripcion: string;
  unidad: string;
  cantidad: number | null; // <-- ACEPTA NULL
  precioUnitario: number | null;
}

@Component({
  selector: 'app-quote-creator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    NgbTypeaheadModule
  ],
  templateUrl: './quote-creator.html',
  styleUrls: ['./quote-creator.scss']
})
export class QuoteCreator {
  numeroCotizacion: string = '';
  cliente: string = '';
  // FECHA AUTOMÁTICA
  fecha: string = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  items: QuoteItem[] = [];
  private nextId = 1;
  toastService = inject(ToastService);

  // LISTA DE MATERIALES ACTUALIZADA
  productosSugeridos: string[] = [
    'Piedra chancada 1/2"',
    'Piedra chancada 3/4"',
    'Piedra chancada 1"',
    'Arena gruesa (por m³)',
    'Arena fina (por m³)',
    'Hormigón',
  ];

  constructor() {
    this.addItem();
  }

  addItem(): void {
    this.items.push({
      id: this.nextId++,
      descripcion: '',
      unidad: 'm³',
      cantidad: null, // <-- EMPIEZA VACÍO
      precioUnitario: null
    });
  }

  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  get subtotal(): number {
    return this.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
  }

  get igv(): number {
    return this.subtotal * 0.18;
  }

  get total(): number {
    return this.subtotal + this.igv;
  }

  search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map((term) =>
        term.length < 2 ? [] : this.productosSugeridos.filter((v) => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10),
      ),
    );

  private formatCurrency(value: number | null): string {
    const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    return formatter.format(value || 0).replace('PEN', 'S/ ');
  }

  generarPDF(): void {
    const doc = new jsPDF();
    const head = [['#', 'Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Total']];
    const body = this.items.map((item, index) => [
      index + 1,
      item.descripcion,
      item.unidad,
      item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))
    ]);

    autoTable(doc, {
      head: head, body: body, startY: 55, theme: 'grid',
      headStyles: { fillColor: [233, 236, 239], textColor: [33, 37, 41] },
      didDrawPage: (data: any) => {
        doc.setFontSize(22); doc.text("COTIZACIÓN", 195, 20, { align: 'right' });
        doc.setFontSize(12); doc.text(this.numeroCotizacion, 195, 28, { align: 'right' });
        doc.text("Tu Empresa S.A.C.", 15, 28); doc.line(15, 35, 195, 35);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text("CLIENTE:", 15, 45);
        doc.setFont('helvetica', 'normal'); doc.text(this.cliente, 40, 45);
        doc.setFont('helvetica', 'bold'); doc.text("FECHA:", 140, 45);
        doc.setFont('helvetica', 'normal'); doc.text(this.fecha, 160, 45);
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const summaryX = 130;
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text("Subtotal:", summaryX, finalY + 10); doc.text(this.formatCurrency(this.subtotal), 195, finalY + 10, { align: 'right' });
    doc.text("IGV (18%):", summaryX, finalY + 17); doc.text(this.formatCurrency(this.igv), 195, finalY + 17, { align: 'right' });
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text("TOTAL:", summaryX, finalY + 25); doc.text(this.formatCurrency(this.total), 195, finalY + 25, { align: 'right' });

    doc.save(`Cotizacion-${this.numeroCotizacion}.pdf`);
  }
}
