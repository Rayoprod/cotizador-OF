import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ToastService } from '../../services/toast'; // <-- RUTA CORREGIDA

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

  // --- NUEVAS VARIABLES PARA LOS CHECKS ---
  incluirIGV: boolean = true;
  entregaEnObra: boolean = false;

  productosSugeridos: string[] = [
    'Piedra chancada 1/2"',
    'Piedra chancada 3/4"',
    'Piedra chancada 1"',
    'Arena gruesa',
    'Arena fina',
    'Hormigón',
  ];

  constructor() {
    this.numeroCotizacion = this._generarNumeroCotizacion();
    this.addItem();
  }

  private _generarNumeroCotizacion(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `COT-${year}${month}${day}-${hours}${minutes}${seconds}`;
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
  get igv(): number {
    return this.incluirIGV ? this.subtotal * 0.18 : 0;
  }
  get total(): number {
    return this.subtotal + this.igv;
  }

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

  async generarPDF(): Promise<void> {
    if (!this.cliente.trim()) {
      this.toastService.show('Error: Por favor, ingresa el nombre del cliente.', { classname: 'bg-danger text-light', delay: 5000 });
      return;
    }
    const itemInvalido = this.items.find(item => !item.descripcion.trim() || (item.cantidad || 0) <= 0 || item.precioUnitario === null);
    if (itemInvalido) {
      this.toastService.show('Error: Revisa los items. Todos deben tener descripción, cantidad y precio.', { classname: 'bg-danger text-light', delay: 5000 });
      return;
    }

    const doc = new jsPDF();
    const head = [['#', 'Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Total']];
    const body = this.items.map((item, index) => [
      index + 1, item.descripcion, item.unidad, item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))
    ]);

    const clienteYPosition = 62;
    const clienteMaxWidth = 95;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const clienteTextLines = doc.splitTextToSize(this.cliente, clienteMaxWidth);
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
        doc.text(this.numeroCotizacion, rightMargin, 27, { align: 'right' });
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
        doc.text(this.fecha, 160, clienteYPosition);

        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const pageCount = (doc as any).internal.getNumberOfPages();
        let footerY = pageHeight - 55;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text("CONDICIONES:", 15, footerY);
        footerY += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        if (this.entregaEnObra) {
          doc.text("* PRECIOS INCLUYEN TRANSPORTE A OBRA.", 15, footerY);
        } else {
          doc.text("* EL MATERIAL SERA RECOGIDO EN CANTERA.", 15, footerY);
        }
        if (!this.incluirIGV) {
          doc.text("* PRECIOS NO INCLUYEN IGV.", 15, footerY + 4);
        }
        footerY += 10;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text("Cuentas:", 15, footerY);
        footerY += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text("* Cta. Detraccion Banco de la Nación: 00615009040", 15, footerY);
        doc.text("* Cta. Banco de Credito: 194-20587879-0-35", 15, footerY + 4);
        doc.text("* CCI. BCP: 00219412058787903595", 15, footerY + 8);
        doc.setDrawColor(primaryColor);
        doc.line(140, pageHeight - 15, 195, pageHeight - 15);
        doc.setFontSize(8); doc.text("FIRMA", 167.5, pageHeight - 11, { align: 'center' });
        doc.setFontSize(8); doc.setTextColor(secondaryColor);
        doc.text('Página ' + data.pageNumber + ' de ' + pageCount, rightMargin, pageHeight - 10, { align: 'right' });
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    const summaryX = 130;
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    if (this.incluirIGV) {
      doc.text("Subtotal:", summaryX, finalY + 10); doc.text(this.formatCurrency(this.subtotal), 195, finalY + 10, { align: 'right' });
      doc.text("IGV (18%):", summaryX, finalY + 17); doc.text(this.formatCurrency(this.igv), 195, finalY + 17, { align: 'right' });
    }
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    const totalLabel = this.incluirIGV ? "TOTAL:" : "TOTAL SIN IGV:";
    const totalY = this.incluirIGV ? finalY + 25 : finalY + 10;
    doc.text(totalLabel, summaryX, totalY);
    doc.text(this.formatCurrency(this.total), 195, totalY, { align: 'right' });

    const pdfBlob = doc.output('blob');
    const fileName = `Cotizacion-${this.numeroCotizacion}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    const isMobile = /Mobi/i.test(window.navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `Cotización ${this.numeroCotizacion}`,
          files: [pdfFile],
        });
        this.toastService.show('¡Cotización compartida!', { classname: 'bg-success text-light' });
      } catch (error) {
        this.toastService.show('Se canceló la acción de compartir.', { classname: 'bg-info text-light' });
      }
    } else {
      doc.save(fileName);
      this.toastService.show('PDF descargado con éxito.', { classname: 'bg-success text-light' });
    }
  }
}
