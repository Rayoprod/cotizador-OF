import { Component, inject, ChangeDetectorRef, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastsComponent } from './components/toasts/toasts';
import { SupabaseService } from './services/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

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


  ngOnInit(): void {
    // Escuchamos CUALQUIER cambio en la sesión
    this.supabaseService.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // !!session convierte el objeto de sesión (o null) en un booleano (true/false)
      this.isLoggedIn = !!session;
      // Forzamos a Angular a que actualice la vista con el nuevo valor
      this.cdr.detectChanges();
    });
  }

  async signOut(): Promise<void> {
    await this.supabaseService.signOut();
    // Navegamos a login. El onAuthStateChange se encargará de ocultar el menú.
    this.router.navigate(['/login']);
  }
  toggleMenu(): void {
    this.zone.run(() => {
      this.isMenuCollapsed = !this.isMenuCollapsed;
    });
  }
}
