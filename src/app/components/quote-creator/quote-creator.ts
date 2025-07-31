import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
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
  numeroCotizacion: string = 'COT-2025-001';
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
      unidad: 'm³',
      cantidad: null,
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
      head: head, body: body, startY: 85,
      theme: 'grid',
      headStyles: { fillColor: [233, 236, 239], textColor: [33, 37, 41] },
      didDrawPage: (data: any) => {
        // --- ENCABEZADO COMBINADO Y CORREGIDO ---
        const pageContent = () => {
          // --- TÍTULO EMPRESA Y TÍTULO COTIZACIÓN ---
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 139); // Color azul oscuro
          doc.text('ELECTROFERRETERO "VIRGEN DEL CARMEN"', 105, 15, { align: 'center' });

          doc.setFontSize(20);
          doc.text('COTIZACIÓN', 195, 15, { align: 'right' });

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0); // Color negro
          doc.text('DE: MARIA LUZ MITMA TORRES', 105, 20, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.text(this.numeroCotizacion, 195, 20, { align: 'right' });
          doc.text('R.U.C. Nº 10215770635', 195, 25, { align: 'right' });


          // --- SERVICIOS ---
          const servicesText = 'ALQUILER DE MAQUINARIA, VENTA DE AGREGADOS DE CONSTRUCCION, CARPINTERIA, PREFABRICADOS, MATERIALES ELECTRICOS Y SERVICIOS GENERALES PARA: PROYECTOS CIVILES, ELECTROMECANICOS, CARPINTERIA Y SERVICIOS EN GENERAL, INSTALACIONES ELECTRICAS EN MEDIA Y BAJA TENSION, EN PLANTAS MINERAS, EN LOCALES COMERCIALES E INDUSTRIALES, COMUNICACIONES, ILUMINACION DE CAMPOS DEPORTIVOS, INSTALACION DE TABLEROS ELECTRICOS DOMESTICOS E INDUSTRIALES';
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 139); // Color azul oscuro
          doc.text(servicesText, 105, 35, { align: 'center', maxWidth: 180 });

          // --- DIRECCIÓN ---
          doc.setFontSize(9);
          doc.text('CALLE LOS SAUDES Mz. 38 LT. 12 - CHALA - CARAVELI - AREQUIPA', 105, 55, { align: 'center' });

          // --- SEPARADOR Y DATOS DEL CLIENTE ---
          doc.line(15, 65, 195, 65); // Línea horizontal separadora
          doc.setTextColor(0, 0, 0); // Resetear a color negro
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text("CLIENTE:", 15, 75);
          doc.setFont('helvetica', 'normal');
          doc.text(this.cliente, 40, 75);

          doc.setFont('helvetica', 'bold');
          doc.text("FECHA:", 140, 75);
          doc.setFont('helvetica', 'normal');
          doc.text(this.fecha, 160, 75);
        };

        pageContent();
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
