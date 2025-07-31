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

  constructor() { this.addItem(); }
  addItem(): void { this.items.push({ id: this.nextId++, descripcion: '', unidad: '', cantidad: null, precioUnitario: null }); }
  onSelectItem(event: NgbTypeaheadSelectItemEvent, item: QuoteItem): void {
    event.preventDefault();
    item.descripcion = event.item;
    if (this.productosSugeridos.includes(event.item)) {
      item.unidad = 'm³';
    }
  }
  removeItem(id: number): void { this.items = this.items.filter(item => item.id !== id); }
  get subtotal(): number { return this.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0); }
  get igv(): number { return this.subtotal * 0.18; }
  get total(): number { return this.subtotal + this.igv; }
  search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) => text$.pipe( debounceTime(200), distinctUntilChanged(), map((term) => term.length < 1 ? [] : this.productosSugeridos.filter((v) => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10), ), );
  private formatCurrency(value: number | null): string {
    const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    return formatter.format(value || 0).replace('PEN', 'S/ ');
  }

  async generarPDF(): Promise<void> {
    const doc = new jsPDF();
    const head = [['#', 'Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Total']];
    const body = this.items.map((item, index) => [
      index + 1, item.descripcion, item.unidad, item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))
    ]);

    // Cargar las imágenes de logo y firma
    const logoBase64 = await this._getBase64ImageFromURL('assets/logo.png');
    const firmaBase64 = await this._getBase64ImageFromURL('assets/firma.png');

    autoTable(doc, {
      head: head, body: body, startY: 85,
      theme: 'grid',
      headStyles: { fillColor: [233, 236, 239], textColor: [33, 37, 41] },
      didDrawPage: (data: any) => {
        // --- ENCABEZADO ---
        if (logoBase64) { doc.addImage(logoBase64, 'PNG', 15, 15, 40, 30); }
        // ... (resto del código del encabezado que ya funcionaba)

        // --- PIE DE PÁGINA ---
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const primaryColor = '#2B3D4F';
        const secondaryColor = '#6c757d';

        // Paginación
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(secondaryColor);
        doc.text('Página ' + data.pageNumber + ' de ' + pageCount, 195, pageHeight - 10, { align: 'right' });

        // Cuentas Bancarias (transcritas de tu imagen)
        let footerY = pageHeight - 35;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        doc.text("CUENTAS BANCARIAS:", 15, footerY);
        footerY += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text("BCP Ahorro Soles: 215-98835496-0-28", 15, footerY);
        doc.text("CCI: 00221519883549602821", 15, footerY + 4);

        doc.text("YAPE: 959371078", 80, footerY);
        doc.text("PLIN: 982079142", 80, footerY + 4);

        // Firma
        if (firmaBase64) {
            doc.addImage(firmaBase64, 'PNG', 140, pageHeight - 40, 50, 25);
        }
        doc.setDrawColor(primaryColor);
        doc.line(140, pageHeight - 15, 195, pageHeight - 15);
        doc.setFontSize(8);
        doc.text("FIRMA", 167.5, pageHeight - 11, { align: 'center' });
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    // ... (resto del código de los totales)

    doc.save(`Cotizacion-${this.numeroCotizacion}.pdf`);
  }

  private _getBase64ImageFromURL(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  }
}
