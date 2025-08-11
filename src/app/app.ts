import { Component, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap'; // <-- Asegúrate de importar esto
import { ToastsComponent } from './components/toasts/toasts';
import { SupabaseService } from './services/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastsComponent,
    CommonModule,
    RouterModule,
    NgbCollapseModule // <-- Y de que esté aquí
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit {
  isMenuCollapsed = true; // <-- Esta es la variable que controla el menú
  isLoggedIn = false;

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.supabaseService.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      this.isLoggedIn = !!session;
      this.cdr.detectChanges();
    });
  }

  async signOut(): Promise<void> {
    await this.supabaseService.signOut();
    this.router.navigate(['/login']);
  }
}
