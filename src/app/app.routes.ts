import { Routes } from '@angular/router';
import { QuoteCreator } from './components/quote-creator/quote-creator';
import { QuoteHistoryComponent } from './components/quote-history/quote-history'; // <-- IMPORTA EL NUEVO COMPONENTE
import { AdminClientes } from './components/admin-clientes/admin-clientes';

export const routes: Routes = [
    { path: '', component: QuoteCreator },
    { path: 'historial', component: QuoteHistoryComponent }, // <-- AÑADE LA NUEVA RUTA
    { path: 'admin/clientes', component: AdminClientes, title: 'Administrar Clientes' }

];
