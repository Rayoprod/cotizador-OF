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
}
