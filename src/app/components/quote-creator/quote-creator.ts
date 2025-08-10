import { Component, inject, OnInit } from '@angular/core';

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
  cliente: string = '';
  selectedClientId: string | null = null; // <-- AÑADE ESTA PROPIEDAD

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


  constructor() {
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

    console.log('Datos cargados:', {
      clientes: this.clientes,
      productos: this.productos
    });
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
          // Buscamos tanto en el nombre completo como en la razón social
          const nombreCompleto = `${c.nombres || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.toLowerCase();
          const razonSocial = (c.razon_social || '').toLowerCase();
          return nombreCompleto.includes(term.toLowerCase()) || razonSocial.includes(term.toLowerCase());
        }).slice(0, 10)
    )
  );

// Esta es la función clave que solucionará el "undefined undefined"
clienteFormatter = (cliente: any): string => {
  if (!cliente) {
    return '';
  }
  // Si tiene razón social, la usamos. Si no, usamos nombres y apellidos.
  return cliente.razon_social || `${cliente.nombres || ''} ${cliente.apellido_paterno || ''}`.trim();
};

seleccionarCliente(evento: NgbTypeaheadSelectItemEvent): void {
  evento.preventDefault();
  const clienteSeleccionado = evento.item;
  // Usamos el mismo formateador para asegurarnos de que se muestre correctamente
  this.cliente = this.clienteFormatter(clienteSeleccionado);
  this.selectedClientId = clienteSeleccionado.id;
}

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

  addItem(): void {
    this.items.push({
      id: this.nextId++,
      descripcion: '',
      unidad: '',
      cantidad: null,
      precioUnitario: null,
      producto_id: null // <-- AÑADE ESTA PROPIEDAD AQUÍ TAMBIÉN

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
    item.producto_id = productoSeleccionado.id;
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



  get subtotal(): number {
    return this.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
  }
  get igv(): number {
    return this.incluirIGV ? this.subtotal * 0.18 : 0;
  }
  get total(): number {
    return this.subtotal + this.igv;
  }


  async generarPDF(): Promise<void> {
  // --- 1. Validaciones ---
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
    // --- 2. Guardar la Cotización Principal ---
    const cotizacionPrincipal = {
      numero_cotizacion: this.numeroCotizacion,
      fecha: this.fecha,
      cliente_id: this.selectedClientId, // Usamos el ID del cliente seleccionado
      subtotal: this.subtotal,
      igv: this.igv,
      total: this.total,
      incluir_igv: this.incluirIGV,
      entrega_en_obra: this.entregaEnObra
    };

    // Insertamos y usamos .select() para que nos devuelva la fila insertada con su nuevo ID
    const { data: cotizacionGuardada, error: errorCotizacion } = await this.supabaseService.supabase
      .from('cotizaciones')
      .insert(cotizacionPrincipal)
      .select()
      .single(); // .single() para obtener un objeto en lugar de un array

    if (errorCotizacion) {
      throw errorCotizacion; // Si hay un error, saltamos al bloque catch
    }

    const nuevaCotizacionId = cotizacionGuardada.id;

    // --- 3. Preparar y Guardar los Items de la Cotización ---
    const itemsParaGuardar = this.items.map(item => ({
      cotizacion_id: nuevaCotizacionId, // El ID que acabamos de obtener
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario_cotizado: item.precioUnitario,
      total_linea: (item.cantidad || 0) * (item.precioUnitario || 0)
    }));

    const { error: errorItems } = await this.supabaseService.supabase
      .from('cotizacion_items')
      .insert(itemsParaGuardar);

    if (errorItems) {
      throw errorItems; // Si hay un error, saltamos al bloque catch
    }

    // --- 4. Generar el PDF (solo si todo lo anterior fue exitoso) ---
    const datosParaPDF: CotizacionData = {
      numeroCotizacion: this.numeroCotizacion,
      cliente: this.cliente, // El nombre del cliente para el PDF
      fecha: this.fecha,
      items: this.items,
      subtotal: this.subtotal,
      igv: this.igv,
      total: this.total,
      incluirIGV: this.incluirIGV,
      entregaEnObra: this.entregaEnObra
    };
    this.pdfService.generarCotizacionPDF(datosParaPDF);
    this.toastService.show('PDF generado y cotización guardada exitosamente.', { classname: 'bg-success text-light' });

  } catch (error: any) {
    this.toastService.show('Error: No se pudo guardar la cotización.', { classname: 'bg-danger text-light', delay: 5000 });
    console.error('Error al guardar en Supabase:', error.message);
  }
}
}
