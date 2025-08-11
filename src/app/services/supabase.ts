import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // ============== FUNCIONES DE LECTURA (FETCH) ==============

  async fetchClientes() {
    const { data, error } = await this.supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error al obtener clientes:', error);
    return data;
  }

  async fetchProductos() {
    const { data, error } = await this.supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error al obtener productos:', error);
    return data;
  }

  async fetchCotizaciones() {
    const { data, error } = await this.supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error al obtener cotizaciones:', error);
    return data;
  }

  async getNextCotizacionNumber() {
    const { data, error } = await this.supabase.rpc('obtener_siguiente_numero_cotizacion');
    if (error) {
      console.error('Error al obtener el número de cotización:', error);
      return `COT-ERROR-${Date.now()}`;
    }
    return data;
  }

  // ============== FUNCIONES DE GESTIÓN DE CLIENTES (CRUD) ==============

  createCliente(clienteData: any) {
    return this.supabase.from('clientes').insert(clienteData);
  }

  updateCliente(id: string, clienteData: any) {
    // Es importante quitar el id del objeto de datos para que no intente actualizar la llave primaria
    delete clienteData.id;
    return this.supabase.from('clientes').update(clienteData).eq('id', id);
  }

  deleteCliente(id: string) {
    return this.supabase.from('clientes').delete().eq('id', id);
  }

  // ============== FUNCIONES DE GESTIÓN DE PRODUCTOS (CRUD) ==============

  createProducto(productoData: any) {
    return this.supabase.from('productos').insert(productoData);
  }

  updateProducto(id: string, productoData: any) {
    delete productoData.id;
    return this.supabase.from('productos').update(productoData).eq('id', id);
  }

  deleteProducto(id: string) {
    return this.supabase.from('productos').delete().eq('id', id);
  }
  // En supabase.service.ts

  // Función para iniciar sesión
  signIn(credentials: { email: string, password: string }) {
    return this.supabase.auth.signInWithPassword(credentials);
  }

  // Función para obtener la sesión actual
  getSession() {
    return this.supabase.auth.getSession();
  }

  // Función para cerrar sesión
  signOut() {
    return this.supabase.auth.signOut();
  }

} // <-- La clase termina aquí, correctamente
