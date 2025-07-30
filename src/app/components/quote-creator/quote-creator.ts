import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ToastService } from '../../services/toast';
import { PdfPreviewComponent } from '../pdf-preview/pdf-preview';

export interface QuoteItem {
  id: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

@Component({
  selector: 'app-quote-creator',
  standalone: true,
  imports: [ CommonModule, FormsModule, CurrencyPipe, NgbModule ],
  templateUrl: './quote-creator.html',
  styleUrls: ['./quote-creator.scss']
})
export class QuoteCreator {
  numeroCotizacion: string = '';
  cliente: string = '';
  fecha: string = '';
  items: QuoteItem[] = [];

  private nextId = 1;
  toastService = inject(ToastService);
  private modalService = inject(NgbModal);
  private sanitizer = inject(DomSanitizer);

  constructor() { this.addItem(); }
  addItem(): void { this.items.push({ id: this.nextId++, descripcion: '', cantidad: 1, precioUnitario: 0 }); }
  removeItem(id: number): void { this.items = this.items.filter(item => item.id !== id); }
  get subtotal(): number { return this.items.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0); }
  get igv(): number { return this.subtotal * 0.18; }
  get total(): number { return this.subtotal + this.igv; }
  private formatCurrency(value: number): string {
    const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    return formatter.format(value || 0).replace('PEN', 'S/ ');
  }

  // MÉTODO generarPDF() ACTUALIZADO CON LÓGICA DIFERENTE PARA MÓVIL Y ESCRITORIO
  async generarPDF(): Promise<void> {
    const doc = this._crearDocumentoPDF();

    // Generar nombre de archivo único
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `Cotizacion_${this.cliente.replace(/ /g, '_') || 'cliente'}_${timestamp}.pdf`;

    // Generar el PDF como un objeto Blob
    const pdfBlob = doc.output('blob');

    // --- LÓGICA INTELIGENTE ---
    // Si el navegador es móvil y soporta la API de Compartir, la usamos.
    if (navigator.share) {
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      try {
        await navigator.share({
          title: `Cotización ${this.numeroCotizacion}`,
          text: `Adjunto la cotización para ${this.cliente}.`,
          files: [pdfFile],
        });
        this.toastService.show('¡Cotización compartida!', { classname: 'bg-success text-light', delay: 3000 });
      } catch (error) {
        this.toastService.show('La acción de compartir fue cancelada.', { classname: 'bg-info text-light', delay: 3000 });
      }
    } else {
      // Si es un navegador de escritorio, abrimos el modal de vista previa.
      const url = URL.createObjectURL(pdfBlob);
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);

      const modalRef = this.modalService.open(PdfPreviewComponent, { size: 'lg', centered: true });
      modalRef.componentInstance.pdfUrl = safeUrl;
      modalRef.componentInstance.pdfBlob = pdfBlob;
      modalRef.componentInstance.fileName = fileName;

      this.toastService.show('Vista previa generada.', { classname: 'bg-info text-light', delay: 3000 });
    }
  }

  // Función privada para no repetir el código de creación del PDF
  private _crearDocumentoPDF(): jsPDF {
    const doc = new jsPDF();
    const head = [['#', 'Descripción', 'Cant.', 'P. Unit.', 'Total']];
    const body = this.items.map((item, index) => [ index + 1, item.descripcion, item.cantidad, this.formatCurrency(item.precioUnitario), this.formatCurrency(item.cantidad * item.precioUnitario) ]);

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

    return doc;
  }
}
