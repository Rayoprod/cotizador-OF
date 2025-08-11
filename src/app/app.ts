import { Component, signal,ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router'; // <-- AÑADIR RouterModule
import { ToastsComponent } from "./components/toasts/toasts";
import { CommonModule } from '@angular/common';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap'; // <-- IMPORTA ESTO
import { Router } from '@angular/router';
import { SupabaseService } from './services/supabase';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastsComponent,CommonModule,RouterModule,NgbCollapseModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})


export class App implements OnInit {
  isMenuCollapsed = true;
  isLoggedIn = false; // <-- Nueva propiedad para controlar la visibilidad

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    // Escuchamos los cambios en la sesión de autenticación
    this.supabaseService.supabase.auth.onAuthStateChange((event, session) => {
      this.isLoggedIn = !!session; // Si hay sesión, isLoggedIn es true. Si no, es false.
      this.cdr.detectChanges(); // Forzamos la detección de cambios
    });
  }

  async signOut(): Promise<void> {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }
}
