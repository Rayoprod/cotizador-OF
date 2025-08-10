import { Component, inject, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { ToastService } from '../../services/toast';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-administradorgeneral',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administradorgeneral.html',
  styleUrls: ['./administradorgeneral.scss']
})
export class AdministradorgeneralComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);
  private modalService = inject(NgbModal); // <-- Servicio para los modales

  public vistaActual: 'clientes' | 'productos' = 'clientes';

  // --- Propiedades para Clientes ---
  public clientes: any[] = [];
  public isLoadingClientes = true;
  public isEditingClient = false;
  public currentClient: any = {};

  // --- Propiedades para Productos ---
  public productos: any[] = [];
  public isLoadingProductos = true;
  public isEditingProduct = false;
  public currentProduct: any = {};

  ngOnInit(): void {
    this.getClientes();
    this.getProductos();
  }

  cambiarVista(vista: 'clientes' | 'productos'): void {
    this.vistaActual = vista;
  }

  // ============== LÓGICA PARA CLIENTES ==============
  async getClientes(): Promise<void> {
    this.isLoadingClientes = true;
    const data = await this.supabaseService.fetchClientes();
    if (data) this.clientes = data;
    this.isLoadingClientes = false;
  }

  openClientModal(content: TemplateRef<any>, cliente?: any): void {
    if (cliente) {
      this.currentClient = { ...cliente };
      this.isEditingClient = true;
    } else {
      this.currentClient = { tipo_documento: 'DNI' };
      this.isEditingClient = false;
    }
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title', size: 'lg' });
  }

  async saveClient(): Promise<void> {
    if (!this.currentClient.nombres && !this.currentClient.razon_social) {
      this.toastService.show('El nombre o razón social es requerido.', { classname: 'bg-danger text-light' });
      return;
    }

    const promise = this.isEditingClient
      ? this.supabaseService.updateCliente(this.currentClient.id, this.currentClient)
      : this.supabaseService.createCliente(this.currentClient);

    const { error } = await promise;
    if (error) {
      this.toastService.show(`Error al ${this.isEditingClient ? 'actualizar' : 'crear'} el cliente.`, { classname: 'bg-danger text-light' });
    } else {
      this.toastService.show(`Cliente ${this.isEditingClient ? 'actualizado' : 'creado'}.`, { classname: 'bg-success text-light' });
    }

    this.modalService.dismissAll(); // Cierra el modal al guardar
    this.getClientes();
  }

  async deleteClient(id: string): Promise<void> {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      const { error } = await this.supabaseService.deleteCliente(id);
      if (error) {
        this.toastService.show('Error al eliminar el cliente.', { classname: 'bg-danger text-light' });
      } else {
        this.toastService.show('Cliente eliminado.', { classname: 'bg-info text-light' });
        this.getClientes();
      }
    }
  }

  // ============== LÓGICA PARA PRODUCTOS ==============
  async getProductos(): Promise<void> {
    this.isLoadingProductos = true;
    const data = await this.supabaseService.fetchProductos();
    if (data) this.productos = data;
    this.isLoadingProductos = false;
  }

  openProductModal(content: TemplateRef<any>, producto?: any): void {
    if (producto) {
      this.currentProduct = { ...producto };
      this.isEditingProduct = true;
    } else {
      this.currentProduct = { unidad: '' };
      this.isEditingProduct = false;
    }
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
  }

  async saveProduct(): Promise<void> {
    if (!this.currentProduct.descripcion || !this.currentProduct.descripcion.trim()) {
      this.toastService.show('La descripción es requerida.', { classname: 'bg-danger text-light' });
      return;
    }

    const promise = this.isEditingProduct
      ? this.supabaseService.updateProducto(this.currentProduct.id, this.currentProduct)
      : this.supabaseService.createProducto(this.currentProduct);

    const { error } = await promise;
    if (error) {
      this.toastService.show(`Error al ${this.isEditingProduct ? 'actualizar' : 'crear'} el producto.`, { classname: 'bg-danger text-light' });
    } else {
      this.toastService.show(`Producto ${this.isEditingProduct ? 'actualizado' : 'creado'}.`, { classname: 'bg-success text-light' });
    }

    this.modalService.dismissAll(); // Cierra el modal al guardar
    this.getProductos();
  }

  async deleteProduct(id: string): Promise<void> {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      const { error } = await this.supabaseService.deleteProducto(id);
      if (error) {
        this.toastService.show('Error al eliminar el producto.', { classname: 'bg-danger text-light' });
      } else {
        this.toastService.show('Producto eliminado.', { classname: 'bg-info text-light' });
        this.getProductos();
      }
    }
  }
   public formatDocumento(cliente: any): string {
    if (!cliente?.numero_documento) {
      return ''; // No muestra nada si no hay número
    }
    // Si tiene razón social, asumimos que es RUC. Si no, usamos el tipo que tenga.
    const tipo = cliente.razon_social ? 'RUC' : cliente.tipo_documento;
    return `${tipo} - ${cliente.numero_documento}`;
  }
}
