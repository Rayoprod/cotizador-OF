import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment'; // <-- 1. AQUÍ SE IMPORTA

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    // 2. Y AQUÍ SE USA PARA CREAR LA CONEXIÓN
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }
  // --- NUEVA FUNCIÓN ---
  async fetchCotizaciones() {
    const { data, error } = await this.supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false }); // Ordena por fecha de creación, la más nueva primero

    if (error) {
      console.error('Error al obtener cotizaciones:', error);
      return [];
    }

    return data;
  }
  /**
   * Obtiene todos los clientes de la base de datos.
   */
  async fetchClientes() {
    const { data, error } = await this.supabase
      .from('clientes')
      .select('*');

    if (error) {
      console.error('Error al obtener clientes:', error);
      return null;
    }
    return data;
  }

  /**
   * Obtiene todos los productos de la base de datos.
   */
  async fetchProductos() {
    const { data, error } = await this.supabase
      .from('productos')
      .select('*');

    if (error) {
      console.error('Error al obtener productos:', error);
      return null;
    }
    return data;
  }
}

