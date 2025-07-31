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
    try {
      const logoBase64 = await this._getBase64ImageFromURL('assets/logowym');
      const firmaBase64 = await this._getBase64ImageFromURL('assets/FIRMA_MARIALUZ.png');

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
          const leftMargin = 15;
          const rightMargin = 195;
          const primaryColor = '#2B3D4F';
          const secondaryColor = '#6c757d';
          const textStartX = leftMargin + 45;

          if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', leftMargin, 15, 40, 30);
          } else {
            // Placeholder si el logo no carga
            doc.setDrawColor(secondaryColor);
            doc.rect(leftMargin, 15, 40, 30);
            doc.setTextColor(secondaryColor);
            doc.text('Logo', leftMargin + 20, 32, { align: 'center' });
          }

          doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
          doc.text('COTIZACIÓN', rightMargin, 20, { align: 'right' });
          doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(secondaryColor);
          doc.text(this.numeroCotizacion, rightMargin, 27, { align: 'right' });
          doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
          doc.text('R.U.C. Nº 10215770635', rightMargin, 34, { align: 'right' });

          let currentY = 18;
          doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
          doc.text('ELECTROFERRETERO "VIRGEN DEL CARMEN"', textStartX, currentY);
          currentY += 5;
          doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(secondaryColor);
          doc.text('DE: MARIA LUZ MITMA TORRES', textStartX, currentY);

          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
          doc.text('CALLE LOS SAUDES Mz. 38 LT. 12 - CHALA - CARAVELI - AREQUIPA', 105, 60, { align: 'center' });
          doc.line(15, 68, 195, 68);
          doc.setFontSize(11); doc.setFont('helvetica', 'bold');
          doc.text("CLIENTE:", 15, 75);
          doc.setFont('helvetica', 'normal');
          doc.text(this.cliente, 40, 75);
          doc.setFont('helvetica', 'bold');
          doc.text("FECHA:", 140, 75);
          doc.setFont('helvetica', 'normal');
          doc.text(this.fecha, 160, 75);

          const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(secondaryColor);
          doc.text('Página ' + data.pageNumber + ' de ' + pageCount, rightMargin, pageHeight - 10, { align: 'right' });

          let footerY = pageHeight - 55;
          doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
          doc.text("CONDICIONES:", 15, footerY);
          footerY += 5;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
          doc.text("* PRECIOS NO INCLUYEN IGV", 15, footerY);
          doc.text("* EL MATERIAL SERA RECOGIDO EN CANTERA", 15, footerY + 4);
          footerY += 10;
          doc.setFontSize(9); doc.setFont('helvetica', 'bold');
          doc.text("Cuentas:", 15, footerY);
          footerY += 5;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
          doc.text("* Cta. Detraccion Banco de la Nación: 00615009040", 15, footerY);
          doc.text("* Cta. Banco de Credito: 194-20587879-0-35", 15, footerY + 4);
          doc.text("* CCI. BCP: 00219412058787903595", 15, footerY + 8);
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
      const summaryX = 130;
      doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text("Subtotal:", summaryX, finalY + 10); doc.text(this.formatCurrency(this.subtotal), 195, finalY + 10, { align: 'right' });
      doc.text("IGV (18%):", summaryX, finalY + 17); doc.text(this.formatCurrency(this.igv), 195, finalY + 17, { align: 'right' });
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text("TOTAL:", summaryX, finalY + 25); doc.text(this.formatCurrency(this.total), 195, finalY + 25, { align: 'right' });

      doc.save(`Cotizacion-${this.numeroCotizacion}.pdf`);
      this.toastService.show('PDF generado con éxito', { classname: 'bg-success text-light' });
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      this.toastService.show('Error al cargar imágenes. Revisa que los archivos de logo y firma existan en src/assets.', { classname: 'bg-danger text-light', delay: 7000 });
    }
  }

  private _getBase64ImageFromURL(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
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
          reject(new Error('No se pudo obtener el contexto del canvas.'));
        }
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = url;
    });
  }
}
