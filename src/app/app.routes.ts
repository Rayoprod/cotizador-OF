import { Routes } from '@angular/router';
import { QuoteCreator } from './components/quote-creator/quote-creator';
import { QuoteHistory } from './components/quote-history/quote-history'; // <-- IMPORTA EL NUEVO COMPONENTE

export const routes: Routes = [
    { path: '', component: QuoteCreator },
    { path: 'historial', component: QuoteHistory } // <-- AÑADE LA NUEVA RUTA
];
