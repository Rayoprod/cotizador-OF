import { Component, inject, OnInit } from '@angular/core'; // <-- Añade OnInit
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';
import { ToastService } from '../../services/toast';
import { FormsModule } from '@angular/forms'; // <-- 1. IMPORTA FormsModule

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  public credentials = { email: '', password: '' };
  public isLoading = false;

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  ngOnInit(): void {
    // ESTA ES LA LÍNEA CLAVE
    // Al cargar el componente de login, nos aseguramos de cerrar cualquier sesión activa.
    this.supabaseService.signOut();
  }

  async login(): Promise<void> {
    if (!this.credentials.email || !this.credentials.password) {

      this.toastService.show('Por favor, ingresa tu email y contraseña.', { classname: 'bg-warning' });
      return;
    }

    this.isLoading = true;
    try {
      const { error } = await this.supabaseService.signIn(this.credentials);

      if (error) {
        throw error;
      }
      // Si el login es exitoso, redirige al creador de cotizaciones
      this.router.navigate(['/crear-cotizacion']);
    } catch (error: any) {
      this.toastService.show(error.message || 'Error al iniciar sesión.', { classname: 'bg-danger text-light' });
    } finally {
      this.isLoading = false;
    }
  }
}
