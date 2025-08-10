import { Routes } from '@angular/router';
import { QuoteCreator } from './components/quote-creator/quote-creator';
import { QuoteHistoryComponent } from './components/quote-history/quote-history'; // <-- IMPORTA EL NUEVO COMPONENTE
import { AdministradorgeneralComponent } from './components/administradorgeneral/administradorgeneral';

export const routes: Routes = [
  { path: '', redirectTo: '/crear-cotizacion', pathMatch: 'full' },
  { path: 'crear-cotizacion', component: QuoteCreator, title: 'Crear Cotización' },
  { path: 'historial', component: QuoteHistoryComponent, title: 'Historial' },
    { path: 'admin', component: AdministradorgeneralComponent, title: 'Administración' }

  // AÑADE ESTA LÍNEA
];
