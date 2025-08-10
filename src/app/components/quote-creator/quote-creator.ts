import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ToastService } from '../../services/toast';
import { SupabaseService } from '../../services/supabase';
import { PdfService } from '../../services/pdf';
import { CotizacionData, QuoteItem } from '../../models/cotizacion.model';

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
export class QuoteCreator implements OnInit {
  // --- Propiedades del Componente ---
  numeroCotizacion: string = '';
  cliente: any = ''; // Se manejará como texto (si escribe) o como objeto (si selecciona)
  fecha: string = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  items: QuoteItem[] = [];
  clientes: any[] = [];
  productos: any[] = [];
  incluirIGV: boolean = true;
  entregaEnObra: boolean = false;
  private nextId = 1;

  // --- Inyección de Servicios ---
  toastService = inject(ToastService);
  supabaseService = inject(SupabaseService);
  private pdfService = inject(PdfService);

  constructor(private cdr: ChangeDetectorRef) {
    this.addItem();
  }

  async ngOnInit(): Promise<void> {
    const [clientesData, productosData] = await Promise.all([
      this.supabaseService.fetchClientes(),
      this.supabaseService.fetchProductos()
    ]);
    this.clientes = clientesData || [];
    this.productos = productosData || [];
  }

  // --- Lógica de Buscador de Clientes ---
  // En quote-creator.ts

  searchClientes: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term =>
        term.length < 2
          ? []
          : this.clientes.filter(c => {
            const busqueda = term.toLowerCase();
            const nombreCompleto = `${c.nombres || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.toLowerCase();
            const razonSocial = (c.razon_social || '').toLowerCase();
            const numeroDoc = (c.numero_documento || '').toLowerCase(); // <-- AÑADIMOS ESTA LÍNEA

            // Y AÑADIMOS LA CONDICIÓN DE BÚSQUEDA
            return nombreCompleto.includes(busqueda) ||
              razonSocial.includes(busqueda) ||
              numeroDoc.includes(busqueda);
          }).slice(0, 10)
      )
    );

  clienteFormatter = (cliente: any): string => {
    if (!cliente) return '';
    if (typeof cliente === 'string') return cliente; // Si es texto, lo devuelve tal cual
    return cliente.razon_social || `${cliente.nombres || ''} ${cliente.apellido_paterno || ''}`.trim();
  };

  // --- Lógica de Items ---
  addItem(): void {
    this.items.push({
      id: this.nextId++,
      descripcion: '', // Se manejará como texto o como objeto
      unidad: '',
      cantidad: null,
      precioUnitario: null,
    });
  }

  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  onProductSelect(event: NgbTypeaheadSelectItemEvent, item: QuoteItem): void {
    event.preventDefault();
    const productoSeleccionado = event.item;
    item.descripcion = productoSeleccionado.descripcion;
    item.unidad = productoSeleccionado.unidad;
    item.precioUnitario = productoSeleccionado.precio_unitario_base;
    this.cdr.detectChanges();
  }

  searchProductos: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term =>
        term.length < 2
          ? []
          : this.productos.filter(p => p.descripcion.toLowerCase().includes(term.toLowerCase())).slice(0, 10)
      )
    );

  productoFormatter = (producto: any): string => {
    if (!producto) return '';
    if (typeof producto === 'string') return producto; // Si es texto, lo devuelve tal cual
    return producto.descripcion || '';
  }

  // --- Getters para Cálculos ---
  get subtotal(): number {
    return this.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
  }
  get igv(): number {
    return this.incluirIGV ? this.subtotal * 0.18 : 0;
  }
  get total(): number {
    return this.subtotal + this.igv;
  }

  // --- Generación de PDF y Guardado ---
  // En quote-creator.ts

  async generarPDF(): Promise<void> {
    // ... (Tus validaciones se quedan igual)
    const nombreCliente = this.clienteFormatter(this.cliente);
    if (!nombreCliente.trim()) { /* ... error ... */ return; }
    const itemInvalido = this.items.find(item => !this.productoFormatter(item.descripcion).trim() || (item.cantidad || 0) <= 0 || item.precioUnitario === null);
    if (itemInvalido) { /* ... error ... */ return; }

    try {
      // 1. OBTENER EL NUEVO NÚMERO DE COTIZACIÓN (AHORA ES EL PRIMER PASO)
      const nuevoNumeroCotizacion = await this.supabaseService.getNextCotizacionNumber();

      // 2. Preparar el objeto para guardar en la BD
      const cotizacionParaGuardar = {
        numero_cotizacion: nuevoNumeroCotizacion, // <-- Usa el número que acabamos de obtener
        fecha: this.fecha,
        cliente: nombreCliente,
        items: this.items.map(item => ({
          descripcion: this.productoFormatter(item.descripcion),
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario
        })),
        subtotal: this.subtotal,
        igv: this.igv,
        total: this.total,
        incluir_igv: this.incluirIGV,
        entrega_en_obra: this.entregaEnObra
      };

      // 3. Guardar en Supabase
      const { error } = await this.supabaseService.supabase
        .from('cotizaciones')
        .insert(cotizacionParaGuardar);
      if (error) throw error;

      // 4. Cargar firma y generar el PDF
      await this.pdfService.cargarFirma();

      this.pdfService.generarCotizacionPDF({
        numeroCotizacion: nuevoNumeroCotizacion, // <-- Usa el mismo número para el PDF
        cliente: nombreCliente,
        fecha: this.fecha,
        items: this.items.map(item => ({
          ...item,
          descripcion: this.productoFormatter(item.descripcion)
        })),
        subtotal: this.subtotal,
        igv: this.igv,
        total: this.total,
        incluirIGV: this.incluirIGV,
        entregaEnObra: this.entregaEnObra
      });
      this.toastService.show(`Cotización ${nuevoNumeroCotizacion} guardada.`, { classname: 'bg-success text-light' });

    } catch (error: any) {
      this.toastService.show('Error: No se pudo guardar la cotización.', { classname: 'bg-danger text-light' });
      console.error('Error al guardar en Supabase:', error.message);
    }
  }
}
