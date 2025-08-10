import { Routes } from '@angular/router';
import { QuoteCreator } from './components/quote-creator/quote-creator';
import { QuoteHistoryComponent } from './components/quote-history/quote-history'; // <-- IMPORTA EL NUEVO COMPONENTE
import { AdminComponent } from './components/admin/admin.component'; // <-- Importa el nuevo componente

export const routes: Routes = [
  { path: '', redirectTo: '/crear-cotizacion', pathMatch: 'full' },
  { path: 'crear-cotizacion', component: QuoteCreator, title: 'Crear Cotización' },
  { path: 'historial', component: QuoteHistoryComponent, title: 'Historial' },
  // AÑADE ESTA LÍNEA
  { path: 'admin', component: AdminComponent, title: 'Administración' } // <-- AÑADE ESTA RUTA SIMPLE
];
