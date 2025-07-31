import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
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
  fecha: string = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  items: QuoteItem[] = [];
  private nextId = 1;
  toastService = inject(ToastService);

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
      unidad: '',
      cantidad: null,
      precioUnitario: null
    });
  }

  onSelectItem(event: NgbTypeaheadSelectItemEvent, item: QuoteItem): void {
    event.preventDefault();
    item.descripcion = event.item;
    if (this.productosSugeridos.includes(event.item)) {
      item.unidad = 'm³';
    }
  }

  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  get subtotal(): number {
    return this.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
  }
  get igv(): number { return this.subtotal * 0.18; }
  get total(): number { return this.subtotal + this.igv; }

  search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map((term) =>
        term.length < 1 ? [] : this.productosSugeridos.filter((v) => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10),
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
      index + 1, item.descripcion, item.unidad, item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))
    ]);

    autoTable(doc, {
      head: head, body: body,
      margin: { top: 85, bottom: 60 },
      theme: 'grid',
      headStyles: { fillColor: [233, 236, 239], textColor: [33, 37, 41] },
      didDrawPage: (data: any) => {
        // --- ENCABEZADO CORREGIDO ---
        const leftMargin = 15;
        const rightMargin = 195;
        const primaryColor = '#2B3D4F';
        const secondaryColor = '#6c757d';

        // --- COLUMNA DERECHA ---
        doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('COTIZACIÓN', rightMargin, 20, { align: 'right' });
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(secondaryColor);
        doc.text(this.numeroCotizacion, rightMargin, 27, { align: 'right' });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('R.U.C. Nº 10215770635', rightMargin, 34, { align: 'right' });

        // --- COLUMNA IZQUIERDA (con posicionamiento secuencial) ---
        let currentY = 15;
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('ELECTROFERRETERO "VIRGEN DEL CARMEN"', leftMargin, currentY);
        currentY += 5;

        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(primaryColor);
        doc.text('DE: MARIA LUZ MITMA TORRES', leftMargin, currentY);
        currentY += 8;

        // --- DESCRIPCIÓN DE LA EMPRESA (AHORA VISIBLE) ---
        const servicesText = 'ALQUILER DE MAQUINARIA, VENTA DE AGREGADOS DE CONSTRUCCIÓN, CARPINTERÍA, PREFABRICADOS, MATERIALES ELÉCTRICOS Y SERVICIOS GENERALES PARA: PROYECTOS CIVILES, ELECTROMECÁNICOS, CARPINTERÍA Y SERVICIOS EN GENERAL, INSTALACIONES ELÉCTRICAS EN MEDIA Y BAJA TENSIÓN, EN PLANTAS MINERAS, EN LOCALES COMERCIALES E INDUSTRIALES, COMUNICACIONES, ILUMINACIÓN DE CAMPOS DEPORTIVOS, INSTALACIÓN DE TABLEROS ELÉCTRICOS DOMÉSTICOS E INDUSTRIALES';
        doc.setFontSize(7); doc.setTextColor(secondaryColor);
        doc.text(servicesText, leftMargin, currentY, { maxWidth: 110, lineHeightFactor: 1.4 });

        // --- DIRECCIÓN ---
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text('CALLE LOS SAUDES Mz. 38 LT. 12 - CHALA - CARAVELI - AREQUIPA', 105, 60, { align: 'center' });

        // --- SEPARADOR Y DATOS DEL CLIENTE ---
        doc.line(15, 68, 195, 68);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text("CLIENTE:", 15, 75);
        doc.setFont('helvetica', 'normal');
        doc.text(this.cliente, 40, 75);
        doc.setFont('helvetica', 'bold');
        doc.text("FECHA:", 140, 75);
        doc.setFont('helvetica', 'normal');
        doc.text(this.fecha, 160, 75);

        // --- PIE DE PÁGINA ---
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const pageCount = (doc as any).internal.getNumberOfPages();
        // ... (resto del pie de página)
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const summaryX = 130;
    // ... (resto de los totales)

    doc.save(`Cotizacion-${this.numeroCotizacion}.pdf`);
  }
}
