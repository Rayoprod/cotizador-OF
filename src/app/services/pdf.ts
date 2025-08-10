import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CotizacionData } from '../models/cotizacion.model';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private firmaBase64: string | null = null; // Para guardar la imagen cargada

  constructor() { }
async cargarFirma(): Promise<void> {
    // Si ya la cargamos antes, no hacemos nada
    if (this.firmaBase64) {
      return;
    }

    try {
      // Lee la imagen desde la carpeta assets
      const response = await fetch('assets/FIRMA_MARIALUZ.png'); // <-- CAMBIA ESTO por el nombre de tu imagen
      const blob = await response.blob();
      const reader = new FileReader();

      // La convertimos a Base64 y la guardamos en la variable
      return new Promise(resolve => {
        reader.onloadend = () => {
          this.firmaBase64 = reader.result as string;
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error al cargar la imagen de la firma:", error);
    }
  }
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
        if (this.firmaBase64) {
          const anchoImagen = 55;
          const altoImagen = 24;
          const xPosicion = 167.5 - (anchoImagen / 2); // Para centrar la imagen
          const yPosicion = pageHeight - 15 - altoImagen; // Posiciona la imagen justo encima de la línea

          doc.addImage(this.firmaBase64, 'PNG', xPosicion, yPosicion, anchoImagen, altoImagen);
        }
        doc.setFontSize(8); doc.setTextColor(secondaryColor);
        doc.text('Página ' + data.pageNumber + ' de ' + pageCount, rightMargin, pageHeight - 10, { align: 'right' });
      },
    });

    // --- INICIO DEL NUEVO BLOQUE DE TOTALES CON TABLA ---
    const finalY = (doc as any).lastAutoTable.finalY;

    // 1. Preparamos el contenido del cuerpo de nuestra nueva tabla de resumen
    const summaryBody = [];

    if (datos.incluirIGV) {
      summaryBody.push(['Subtotal:', this.formatCurrency(datos.subtotal)]);
      summaryBody.push(['IGV (18%):', this.formatCurrency(datos.igv)]);
    }

    // La fila del total siempre se añade
    summaryBody.push([
      datos.incluirIGV ? 'TOTAL:' : 'TOTAL SIN IGV:',
      this.formatCurrency(datos.total)
    ]);

    // 2. Dibujamos la tabla de resumen usando autoTable
    autoTable(doc, {
      // El contenido que acabamos de preparar
      body: summaryBody,
      // Posición vertical justo debajo de la tabla principal
      startY: finalY + 5,
      // Usamos el tema 'plain' para que no tenga bordes ni cabeceras
      theme: 'plain',
      // Definimos un ancho fijo y un margen para alinear la tabla a la derecha
      tableWidth: 85,
      margin: { left: 110 },
      // Estilos para las columnas para un alineado perfecto
      columnStyles: {
        0: { // Columna de etiquetas (Subtotal, IGV, TOTAL)
          halign: 'right', // Alineamos la etiqueta a la derecha
          fontStyle: 'normal',
        },
        1: { // Columna de montos
          halign: 'right', // Alineamos el monto a la derecha
        }
      },
      // Hook para poner en negrita la última fila (la del TOTAL)
      didParseCell: function (data) {
        // Si es la última fila del resumen
        if (data.row.index === summaryBody.length - 1) {
          // Aplicamos el estilo de negrita a todas las celdas de esa fila
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
// --- FIN DEL NUEVO BLOQUE DE TOTALES CON TABLA ---

    doc.output('dataurlnewwindow');
  }
}
