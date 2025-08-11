// En app.routes.ts
import { Routes } from '@angular/router';
import { QuoteCreator } from './components/quote-creator/quote-creator';
import { QuoteHistoryComponent } from './components/quote-history/quote-history';
import { AdministradorgeneralComponent } from './components/administradorgeneral/administradorgeneral';
import { LoginComponent } from './components/login/login'; // <-- Importa el login
import { authGuard } from './services/auth-guard'; // <-- Importa el guardia

export const routes: Routes = [
  // La página de login es pública
  { path: 'login', component: LoginComponent, title: 'Iniciar Sesión' },

  // Las demás páginas ahora están protegidas por el guardia
  { path: 'crear-cotizacion', component: QuoteCreator, title: 'Crear Cotización', canActivate: [authGuard] },
  { path: 'historial', component: QuoteHistoryComponent, title: 'Historial', canActivate: [authGuard] },
  { path: 'admin', component: AdministradorgeneralComponent, title: 'Administración', canActivate: [authGuard] },

  // Redirección por defecto
  { path: '', redirectTo: '/crear-cotizacion', pathMatch: 'full' }
];
