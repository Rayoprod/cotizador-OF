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

  numeroCotizacion: string = 'Cargando...'; // Valor inicial mientras espera
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
    this.addItem();
  }

  async ngOnInit(): Promise<void> {

    // La primera acción ahora es obtener el número de cotización
    this.numeroCotizacion = await this.supabaseService.getNextCotizacionNumber();
    this.cdr.detectChanges(); // Actualizamos la vista con el nuevo número
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
    evento.preventDefault(); // Previene el comportamiento por defecto
    const clienteSeleccionado = evento.item;
    // Usamos el formateador para asegurarnos de que this.cliente sea un string
    this.cliente = this.clienteFormatter(clienteSeleccionado);
    this.cdr.detectChanges(); // Forzamos la actualización de la vista
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

  // En quote-creator.ts

  // En quote-creator.ts
async generarPDF(): Promise<void> {
  const nombreCliente = this.clienteFormatter(this.cliente);

  // 1. Validaciones
  if (!nombreCliente.trim()) {
    this.toastService.show('Error: Por favor, ingresa o selecciona un cliente.', { classname: 'bg-danger text-light' });
    return;
  }
  const itemInvalido = this.items.find(item => !this.productoFormatter(item.descripcion).trim() || (item.cantidad || 0) <= 0 || item.precioUnitario === null);
  if (itemInvalido) {
    this.toastService.show('Error: Revisa los items.', { classname: 'bg-danger text-light' });
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

    // El objeto para el PDF ahora usa los items originales (que sí tienen id)
    // pero con el cliente ya formateado como texto.
    this.pdfService.generarCotizacionPDF({
      numeroCotizacion: this.numeroCotizacion,
      cliente: nombreCliente,
      fecha: this.fecha,
      items: this.items, // Pasamos los items originales, que cumplen con la interfaz
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


      this.toastService.show('PDF generado y cotización guardada.', { classname: 'bg-success text-light' });


    } catch (error: any) {
      this.toastService.show('Error: No se pudo guardar la cotización.', { classname: 'bg-danger text-light' });
      console.error('Error al guardar en Supabase:', error.message);
    }
  }

