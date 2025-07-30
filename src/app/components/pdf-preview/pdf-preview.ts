import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-preview.html',
  styleUrls: ['./pdf-preview.scss']
})
export class PdfPreviewComponent {
  @Input() pdfUrl!: SafeResourceUrl;
  @Input() pdfBlob!: Blob;
  @Input() fileName!: string;

  // Variable para saber si el navegador soporta la función de compartir
  canShare: boolean = !!navigator.share;

  constructor(public activeModal: NgbActiveModal, private sanitizer: DomSanitizer) {}

  // Función para descargar el archivo
  download() {
    const link = document.createElement('a');
    link.href = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(this.pdfBlob)) as string;
    link.download = this.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Función para compartir el archivo (solo en móviles)
  async share() {
    const pdfFile = new File([this.pdfBlob], this.fileName, { type: 'application/pdf' });
    if (navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: 'Cotización',
          text: `Adjunto la cotización ${this.fileName}`,
          files: [pdfFile],
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    }
  }
}
