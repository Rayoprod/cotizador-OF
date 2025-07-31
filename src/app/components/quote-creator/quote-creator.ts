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
        // ==========================================================
        // ===== ENCABEZADO CON ESPACIO PARA LOGO Y MEJOR DISEÑO ====
        // ==========================================================
        const pageContent = () => {
          const leftMargin = 15;
          const rightMargin = 195;
          const primaryColor = '#2B3D4F'; // Un gris azulado oscuro
          const secondaryColor = '#6c757d'; // Gris secundario

          // --- ESPACIO PARA EL LOGO ---
          doc.setDrawColor(222, 226, 230); // Borde gris claro
          doc.setFillColor(248, 249, 250); // Fondo gris muy claro
          doc.rect(leftMargin, 15, 40, 30, 'FD'); // Rectángulo del logo
          doc.setTextColor(secondaryColor);
          doc.setFontSize(10);
          doc.text('LOGO', leftMargin + 20, 32, { align: 'center' });


          // --- COLUMNA DERECHA: Datos de la Cotización ---
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(primaryColor);
          doc.text('COTIZACIÓN', rightMargin, 20, { align: 'right' });

          doc.setFontSize(11);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(secondaryColor);
          doc.text(this.numeroCotizacion, rightMargin, 27, { align: 'right' });

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(primaryColor);
          doc.text('R.U.C. Nº 10215770635', rightMargin, 34, { align: 'right' });


          // --- TEXTO PRINCIPAL (al lado del logo) ---
          const textStartX = leftMargin + 45; // Empezar texto después del logo
          let currentY = 18;
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(primaryColor);
          doc.text('ELECTROFERRETERO "VIRGEN DEL CARMEN"', textStartX, currentY);
          currentY += 5;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(secondaryColor);
          doc.text('DE: MARIA LUZ MITMA TORRES', textStartX, currentY);
          currentY += 8;

          // --- Servicios (dividido para mejor lectura) ---
          const servicesTitle = 'ALQUILER DE MAQUINARIA, VENTA DE AGREGADOS, CARPINTERÍA, PREFABRICADOS, MATERIALES ELÉCTRICOS Y SERVICIOS GENERALES.';
          doc.setFontSize(7);
          doc.setTextColor(secondaryColor);
          doc.text(servicesTitle, textStartX, currentY, { maxWidth: 90 });
          currentY += 15;

          // --- Dirección (abajo, centrada) ---
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(primaryColor);
          doc.text('CALLE LOS SAUCES Mz. 38 LT. 12 - CHALA - CARAVELI - AREQUIPA', 105, 60, { align: 'center' });


          // --- SEPARADOR Y DATOS DEL CLIENTE ---
          doc.line(15, 68, 195, 68); // Línea horizontal separadora
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
