import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss']
})
export class AdminComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);

  // Propiedad para controlar qué vista mostramos: 'clientes' o 'productos'
  public vistaActual: 'clientes' | 'productos' = 'clientes';

  // --- Propiedades para Clientes ---
  public clientes: any[] = [];
  public isLoadingClientes = true;
  public isEditingClient = false;
  public currentClient: any = {};

  // --- Propiedades para Productos (las usaremos después) ---
  public productos: any[] = [];
  public isLoadingProductos = true;

  ngOnInit(): void {
    this.getClientes();
    // this.getProductos(); // <-- Lo activaremos después
  }

  // --- Función para cambiar de vista ---
  cambiarVista(vista: 'clientes' | 'productos'): void {
    this.vistaActual = vista;
    if (vista === 'clientes') this.getClientes();
    // if (vista === 'productos') this.getProductos(); // <-- Lo activaremos después
  }

  // ============== LÓGICA PARA CLIENTES ==============
  async getClientes(): Promise<void> {
    this.isLoadingClientes = true;
    const data = await this.supabaseService.fetchClientes();
    if (data) {
      this.clientes = data;
    }
    this.isLoadingClientes = false;
  }

  public prepareNewClient(): void {
    this.currentClient = { tipo_documento: 'DNI' };
    this.isEditingClient = false;
  }

  public selectClientForEdit(cliente: any): void {
    this.currentClient = { ...cliente };
    this.isEditingClient = true;
  }

  public async saveClient(): Promise<void> {
    if (!this.currentClient.nombres && !this.currentClient.razon_social) {
      this.toastService.show('El nombre o razón social es requerido.', { classname: 'bg-danger text-light' });
      return;
    }

    if (this.isEditingClient) {
      const { error } = await this.supabaseService.updateCliente(this.currentClient.id, this.currentClient);
      if (error) {
        this.toastService.show('Error al actualizar el cliente.', { classname: 'bg-danger text-light' });
      } else {
        this.toastService.show('Cliente actualizado.', { classname: 'bg-success text-light' });
      }
    } else {
      const { error } = await this.supabaseService.createCliente(this.currentClient);
      if (error) {
        this.toastService.show('Error al crear el cliente.', { classname: 'bg-danger text-light' });
      } else {
        this.toastService.show('Cliente creado.', { classname: 'bg-success text-light' });
      }
    }
    this.cancelEdit();
    this.getClientes();
  }

  public async deleteClient(id: string): Promise<void> {
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

  public cancelEdit(): void {
    this.currentClient = {};
    this.isEditingClient = false;
  }
}
