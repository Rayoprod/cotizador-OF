import { Component, inject, OnInit } from '@angular/core';

import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ToastService } from '../../services/toast';
import { SupabaseService } from '../../services/supabase';
import { PdfService} from '../../services/pdf';
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
export class QuoteCreator implements OnInit{
  numeroCotizacion: string = '';
  cliente: string = '';
    selectedClientId: string | null = null; // <-- AÑADE ESTA PROPIEDAD

  fecha: string = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  items: QuoteItem[] = [];
clientes: any[] = [];
  productos: any[] = [];
  private nextId = 1;
  toastService = inject(ToastService);
  supabaseService = inject(SupabaseService);
  private pdfService = inject(PdfService);

  incluirIGV: boolean = true;
  entregaEnObra: boolean = false;

  productosSugeridos: string[] = [
    'Piedra chancada 1/2"',
    'Piedra chancada 3/4"',
    'Piedra chancada 1"',
    'Arena gruesa',
    'Arena fina',
    'Hormigón',
  ];

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
searchClientes: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term =>
        term.length < 2
        ? []
        : this.clientes.filter(c => {
            const fullName = `${c.nombres || ''} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.toLowerCase();
            return fullName.includes(term.toLowerCase());
          }).slice(0, 10)
      )
    );

  clienteFormatter = (cliente: any): string => `${cliente.nombres} ${cliente.apellido_paterno}`;

  seleccionarCliente(evento: NgbTypeaheadSelectItemEvent): void {
    evento.preventDefault();
    const clienteSeleccionado = evento.item;
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
  
  removeItem(id: number): void {
    this.items = this.items.filter(item => item.id !== id);
  }

  get subtotal(): number {
    return this.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0);
  }
  get igv(): number {
    return this.incluirIGV ? this.subtotal * 0.18 : 0;
  }
  get total(): number {
    return this.subtotal + this.igv;
  }

  search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map((term) =>
        term.length < 1 ? [] : this.productosSugeridos.filter((v) => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10),
      ),
    );

  async generarPDF(): Promise<void> {
    if (!this.cliente.trim()) {
        this.toastService.show('Error: Por favor, ingresa el nombre del cliente.', { classname: 'bg-danger text-light', delay: 5000 });
        return;
    }
    const itemInvalido = this.items.find(item => !item.descripcion.trim() || (item.cantidad || 0) <= 0 || item.precioUnitario === null);
    if (itemInvalido) {
        this.toastService.show('Error: Revisa los items. Todos deben tener descripción, cantidad y precio.', { classname: 'bg-danger text-light', delay: 5000 });
        return;
    }

    const datosCotizacion: CotizacionData = {
      numeroCotizacion: this.numeroCotizacion,
      cliente: this.cliente,
      fecha: this.fecha,
      items: this.items,
      subtotal: this.subtotal,
      igv: this.igv,
      total: this.total,
      incluirIGV: this.incluirIGV,
      entregaEnObra: this.entregaEnObra
    };

    const { error } = await this.supabaseService.supabase.from('cotizaciones').insert([{
  numero_cotizacion: datosCotizacion.numeroCotizacion,
  cliente: datosCotizacion.cliente,
  fecha: datosCotizacion.fecha,
  items: datosCotizacion.items,
  subtotal: datosCotizacion.subtotal,        // <-- AÑADIDO
  igv: datosCotizacion.igv,                  // <-- AÑADIDO
  total: datosCotizacion.total,
  incluir_igv: datosCotizacion.incluirIGV,     // <-- AÑADIDO
  entrega_en_obra: datosCotizacion.entregaEnObra // <-- AÑADIDO
    }]);

    if (error) {
      this.toastService.show('Error: No se pudo guardar la cotización en la base de datos.', { classname: 'bg-danger text-light', delay: 5000 });
      console.error('Error al guardar en Supabase:', error);
      return;
    }

    this.pdfService.generarCotizacionPDF(datosCotizacion);

    this.toastService.show('PDF generado y cotización guardada.', { classname: 'bg-success text-light' });
  }
}
