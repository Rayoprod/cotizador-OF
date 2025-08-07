import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CotizacionData } from '../models/cotizacion.model';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  private formatCurrency(value: number | null): string {
    const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
    return formatter.format(value || 0).replace('PEN', 'S/ ');
  }

  generarCotizacionPDF(datos: CotizacionData): void {
    const doc = new jsPDF();
    const head = [['N°', 'Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Total']];
    const body = datos.items.map((item: any, index: number) => [
      index + 1,
      item.descripcion,
      item.unidad,
      item.cantidad,
      this.formatCurrency(item.precioUnitario),
      this.formatCurrency((item.cantidad || 0) * (item.precioUnitario || 0))
    ]);

    const clienteYPosition = 62;
    const clienteMaxWidth = 95;
    const clienteTextLines = doc.splitTextToSize(datos.cliente, clienteMaxWidth);
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
        doc.text(datos.numeroCotizacion, rightMargin, 27, { align: 'right' });
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
        doc.text(datos.fecha, 160, clienteYPosition);

        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const pageCount = (doc as any).internal.getNumberOfPages();
        let footerY = pageHeight - 55;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryColor);
        doc.text("CONDICIONES:", 15, footerY);
        footerY += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        if (datos.entregaEnObra) {
          doc.text("* PRECIOS INCLUYEN TRANSPORTE A OBRA.", 15, footerY);
        } else {
          doc.text("* EL MATERIAL SERA RECOGIDO EN CANTERA.", 15, footerY);
        }
        if (!datos.incluirIGV) {
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
    const summaryStartY = finalY + 8;
    const labelColumnX = 165; // Columna para etiquetas (alineadas a la derecha)
    const valueColumnX = 195;  // Columna para montos (alineados a la derecha)
    const lineHeight = 6;
    let currentY = summaryStartY;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Dibuja Subtotal e IGV si es necesario
    if (datos.incluirIGV) {
      // Alinea la etiqueta a la derecha en su propia columna
      doc.text("Subtotal:", labelColumnX, currentY, { align: 'right' });
      doc.text(this.formatCurrency(datos.subtotal), valueColumnX, currentY, { align: 'right' });
      currentY += lineHeight;

      doc.text("IGV (18%):", labelColumnX, currentY, { align: 'right' });
      doc.text(this.formatCurrency(datos.igv), valueColumnX, currentY, { align: 'right' });
      currentY += lineHeight;

      doc.setDrawColor('#cccccc');
      doc.line(labelColumnX - 25, currentY - (lineHeight / 2), valueColumnX, currentY - (lineHeight / 2));
    }

    // Total final en negrita
    doc.setFont('helvetica', 'bold');
    const totalLabel = datos.incluirIGV ? "TOTAL:" : "TOTAL SIN IGV:";
    // Alinear la etiqueta a la derecha en su columna garantiza que no choque con el valor
    doc.text(totalLabel, labelColumnX, currentY, { align: 'right' });
    doc.text(this.formatCurrency(datos.total), valueColumnX, currentY, { align: 'right' });
// --- FIN DEL NUEVO BLOQUE DE TOTALES A PRUEBA DE TODO ---

    doc.output('dataurlnewwindow');
  }
}
