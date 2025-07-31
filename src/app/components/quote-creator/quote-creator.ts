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
  // --- PEGA AQUÍ TUS CÓDIGOS BASE64 ---
  logoBase64: string = 'data:image/png;base64,PEGA_AQUI_EL_TEXTO_BASE64_DE_TU_LOGO';
  firmaBase64: string = 'data:image/png;base64,PEGA_AQUI_EL_TEXTO_BASE64_DE_TU_FIRMA';

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
            if (this.logoBase64.length > 100) {
                doc.addImage(this.logoBase64, 'PNG', 15, 15, 40, 30);
            }
            // ... (resto del encabezado)

            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            if (this.firmaBase64.length > 100) {
                doc.addImage(this.firmaBase64, 'PNG', 140, pageHeight - 40, 50, 25);
            }
            // ... (resto del pie de página)
        },
    });
    // ... (código para los totales y guardar el PDF)
    doc.save(`Cotizacion-${this.numeroCotizacion}.pdf`);
  }
}
