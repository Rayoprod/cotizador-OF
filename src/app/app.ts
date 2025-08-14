import { Component, inject, ChangeDetectorRef, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastsComponent } from './components/toasts/toasts';
import { SupabaseService } from './services/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SwUpdate } from '@angular/service-worker'; // <-- 1. Importar SwUpdate


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastsComponent, CommonModule, RouterModule, NgbCollapseModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  isMenuCollapsed = true;
  isLoggedIn = false; // Por defecto, nadie ha iniciado sesión

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone); // <-- AÑADE ESTA LÍNEA
  private swUpdate = inject(SwUpdate); // <-- 2. Inyectar SwUpdate



  ngOnInit(): void {
    // Escuchamos CUALQUIER cambio en la sesión
    this.supabaseService.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // !!session convierte el objeto de sesión (o null) en un booleano (true/false)
      this.isLoggedIn = !!session;
      // Forzamos a Angular a que actualice la vista con el nuevo valor
      this.cdr.detectChanges();
    });

    // --- LÓGICA PARA ACTUALIZACIONES DE LA PWA ---
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(evt => {
        if (evt.type === 'VERSION_READY') {
          if (confirm("Nueva versión disponible. ¿Cargar ahora?")) {
            // Recarga la página para obtener la última versión.
            window.location.reload();
          }
        }
      });
    }

  }


  async signOut(): Promise<void> {
    if (confirm('¿Estás seguro de que deseas cerrar la sesión?')) {
      await this.supabaseService.signOut();

      // Forzamos el estado a 'desconectado' inmediatamente
      this.isLoggedIn = false;

      // Forzamos una recarga completa de la página hacia el login
      window.location.href = '/login';
    }
  }
  toggleMenu(): void {
    this.zone.run(() => {
      this.isMenuCollapsed = !this.isMenuCollapsed;
    });
  }
}
