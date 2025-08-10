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
  numeroCotizacion: string = 'Cargando...';
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
    // 1. Obtiene el número de cotización secuencial
    this.numeroCotizacion = await this.supabaseService.getNextCotizacionNumber();
    this.cdr.detectChanges(); // Actualiza la vista con el número

    // 2. Carga los datos para el autocompletar
    const [clientesData, productosData] = await Promise.all([
      this.supabaseService.fetchClientes(),
      this.supabaseService.fetchProductos()
    ]);
    this.clientes = clientesData || [];
    this.productos = productosData || [];
  }

  // --- Lógica de Buscador de Clientes ---
  searchClientes: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term =>
        term.length < 2
          ? []
          : this.clientes.filter(c => {
              const nombreCompleto = `${c.nombres || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.toLowerCase();
              const razonSocial = (c.razon_social || '').toLowerCase();
              return nombreCompleto.includes(term.toLowerCase()) || razonSocial.includes(term.toLowerCase());
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
  async generarPDF(): Promise<void> {
    const nombreCliente = this.clienteFormatter(this.cliente);

    // 1. Validaciones
    if (!nombreCliente.trim()) {
      this.toastService.show('Error: Por favor, ingresa o selecciona un cliente.', { classname: 'bg-danger text-light' });
      return;
    }
    const itemInvalido = this.items.find(item => !this.productoFormatter(item.descripcion).trim() || (item.cantidad || 0) <= 0 || item.precioUnitario === null);
    if (itemInvalido) {
      this.toastService.show('Error: Revisa los items. Todos deben tener descripción, cantidad y precio.', { classname: 'bg-danger text-light' });
      return;
    }

    try {
      // 2. Preparar el objeto para guardar en la BD (con textos limpios)
      const cotizacionParaGuardar = {
        numero_cotizacion: this.numeroCotizacion,
        fecha: this.fecha,
        cliente: nombreCliente,
        items: this.items.map(item => ({
          descripcion: this.productoFormatter(item.descripcion), // Asegura que sea texto
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
        numeroCotizacion: this.numeroCotizacion,
        cliente: nombreCliente,
        fecha: this.fecha,
        items: this.items.map(item => ({
          ...item, // Copia todas las propiedades del item original
          descripcion: this.productoFormatter(item.descripcion) // Sobrescribe la descripción con el texto limpio
        })),
        subtotal: this.subtotal,
        igv: this.igv,
        total: this.total,
        incluirIGV: this.incluirIGV,
        entregaEnObra: this.entregaEnObra
      });
      this.toastService.show('PDF generado y cotización guardada exitosamente.', { classname: 'bg-success text-light' });

    } catch (error: any) {
      this.toastService.show('Error: No se pudo guardar la cotización.', { classname: 'bg-danger text-light' });
      console.error('Error al guardar en Supabase:', error.message);
    }
  }
}
