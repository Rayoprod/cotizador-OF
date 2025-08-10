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
  numeroCotizacion: string = '';
  cliente: any = null; // Cambiamos a 'any' para manejar el objeto temporalmente
  selectedClientId: string | null = null;
  fecha: string = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  items: QuoteItem[] = [];
  clientes: any[] = [];
  productos: any[] = [];
  incluirIGV: boolean = true;
  entregaEnObra: boolean = false;
  private nextId = 1;

  toastService = inject(ToastService);
  supabaseService = inject(SupabaseService);
  private pdfService = inject(PdfService);

  constructor(private cdr: ChangeDetectorRef) {
    this.numeroCotizacion = this._generarNumeroCotizacion();
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

  // --- Lógica de Buscador de Clientes (CORREGIDA) ---
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
    return cliente.razon_social || `${cliente.nombres || ''} ${cliente.apellido_paterno || ''}`.trim();
  };

  seleccionarCliente(evento: NgbTypeaheadSelectItemEvent): void {
    const clienteSeleccionado = evento.item;
    this.cliente = this.clienteFormatter(clienteSeleccionado); // Para mostrar en PDF
    this.selectedClientId = clienteSeleccionado.id; // Para guardar en BD
  }

  // --- Lógica de Items (CORREGIDA) ---
  addItem(): void {
    this.items.push({
      id: this.nextId++,
      descripcion: '',
      unidad: '',
      cantidad: null,
      precioUnitario: null,
      producto_id: null
    });
  }

  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  onProductSelect(event: NgbTypeaheadSelectItemEvent, item: QuoteItem): void {
    const productoSeleccionado = event.item;
    item.descripcion = productoSeleccionado.descripcion; // Para PDF
    item.unidad = productoSeleccionado.unidad;
    item.precioUnitario = productoSeleccionado.precio_unitario_base;
    item.producto_id = productoSeleccionado.id; // Para BD
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

  productoFormatter = (producto: any): string => producto.descripcion;

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
    // 1. Validaciones
    if (!this.selectedClientId) {
      this.toastService.show('Error: Por favor, selecciona un cliente de la lista.', { classname: 'bg-danger text-light', delay: 5000 });
      return;
    }
    const itemInvalido = this.items.find(item => !item.producto_id || (item.cantidad || 0) <= 0 || item.precioUnitario === null);
    if (itemInvalido) {
      this.toastService.show('Error: Revisa los items. Todos deben tener producto, cantidad y precio.', { classname: 'bg-danger text-light', delay: 5000 });
      return;
    }

    try {
      // 2. Guardar la Cotización Principal
      const cotizacionPrincipal = {
        numero_cotizacion: this.numeroCotizacion,
        fecha: this.fecha,
        cliente_id: this.selectedClientId,
        subtotal: this.subtotal,
        igv: this.igv,
        total: this.total,
        incluir_igv: this.incluirIGV,
        entrega_en_obra: this.entregaEnObra
      };
      await this.pdfService.cargarFirma();

      const { data: cotizacionGuardada, error: errorCotizacion } = await this.supabaseService.supabase
        .from('cotizaciones')
        .insert(cotizacionPrincipal)
        .select()
        .single();

      if (errorCotizacion) throw errorCotizacion;
      const nuevaCotizacionId = cotizacionGuardada.id;

      // 3. Preparar y Guardar los Items
      const itemsParaGuardar = this.items.map(item => ({
        cotizacion_id: nuevaCotizacionId,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario_cotizado: item.precioUnitario,
        total_linea: (item.cantidad || 0) * (item.precioUnitario || 0)
      }));

      const { error: errorItems } = await this.supabaseService.supabase
        .from('cotizacion_items')
        .insert(itemsParaGuardar);

      if (errorItems) throw errorItems;

      // 4. Generar el PDF
      type ProductoDescripcion = {
        descripcion?: string;
        nombre?: string;
        [key: string]: any;
      };

      // antes de llamar a pdfService.generarCotizacionPDF(...)
      const clienteParaPDF =
        typeof this.cliente === 'object' && this.cliente !== null
          ? this.clienteFormatter(this.cliente)
          : String(this.cliente || '');


      const itemsParaPDF = this.items.map(it => {
        let descripcion = it.descripcion;

        if (typeof descripcion === 'object' && descripcion !== null) {
          const descObj = descripcion as ProductoDescripcion;
          descripcion =
            descObj.descripcion ||
            descObj.nombre ||
            JSON.stringify(descObj);
        }

        return {
          ...it,
          descripcion: String(descripcion || ''),
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        };
      });


      const datosParaPDF: CotizacionData = {
        numeroCotizacion: this.numeroCotizacion,
        cliente: clienteParaPDF,
        fecha: this.fecha,
        items: itemsParaPDF,
        subtotal: this.subtotal,
        igv: this.igv,
        total: this.total,
        incluirIGV: this.incluirIGV,
        entregaEnObra: this.entregaEnObra
      };

      console.log('datosParaPDF (final):', datosParaPDF);
      this.pdfService.generarCotizacionPDF(datosParaPDF);

      this.toastService.show('PDF generado y cotización guardada exitosamente.', { classname: 'bg-success text-light' });

    } catch (error: any) {
      this.toastService.show('Error: No se pudo guardar la cotización.', { classname: 'bg-danger text-light', delay: 5000 });
      console.error('Error al guardar en Supabase:', error.message);
    }
  }

  // --- Funciones Privadas ---
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
}
