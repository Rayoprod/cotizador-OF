import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-admin-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-clientes.html',
  styleUrls: ['./admin-clientes.scss']
})
export class AdminClientesComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);

  public clientes: any[] = [];
  public isLoading = true;
  public isEditing = false;
  public currentClient: any = {}; // Objeto para el formulario

  ngOnInit(): void {
    this.getClientes();
  }

  async getClientes(): Promise<void> {
    this.isLoading = true;
    const data = await this.supabaseService.fetchClientes();
    if (data) {
      this.clientes = data;
    }
    this.isLoading = false;
  }

  public prepareNewClient(): void {
    this.currentClient = { tipo_documento: 'DNI' }; // Valor por defecto
    this.isEditing = false;
    // Idealmente, aquí se abriría un modal, pero por ahora solo preparamos el objeto
  }

  public selectClientForEdit(cliente: any): void {
    // Creamos una copia para no modificar la lista directamente
    this.currentClient = { ...cliente };
    this.isEditing = true;
  }

  public async saveClient(): Promise<void> {
    if (!this.currentClient.nombres && !this.currentClient.razon_social) {
      this.toastService.show('El nombre o razón social es requerido.', { classname: 'bg-danger text-light' });
      return;
    }

    if (this.isEditing) {
      // Actualizar cliente existente
      const { error } = await this.supabaseService.updateCliente(this.currentClient.id, this.currentClient);
      if (error) {
        this.toastService.show('Error al actualizar el cliente.', { classname: 'bg-danger text-light' });
      } else {
        this.toastService.show('Cliente actualizado exitosamente.', { classname: 'bg-success text-light' });
      }
    } else {
      // Crear nuevo cliente
      const { error } = await this.supabaseService.createCliente(this.currentClient);
      if (error) {
        this.toastService.show('Error al crear el cliente.', { classname: 'bg-danger text-light' });
      } else {
        this.toastService.show('Cliente creado exitosamente.', { classname: 'bg-success text-light' });
      }
    }

    this.cancelEdit();
    this.getClientes(); // Recargar la lista
  }

  public async deleteClient(id: string): Promise<void> {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      const { error } = await this.supabaseService.deleteCliente(id);
      if (error) {
        this.toastService.show('Error al eliminar el cliente.', { classname: 'bg-danger text-light' });
      } else {
        this.toastService.show('Cliente eliminado.', { classname: 'bg-info text-light' });
        this.getClientes(); // Recargar la lista
      }
    }
  }

  public cancelEdit(): void {
    this.currentClient = {};
    this.isEditing = false;
  }
}
