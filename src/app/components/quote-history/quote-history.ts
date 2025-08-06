import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase';

// Definimos una interfaz para la estructura de la cotización que recibiremos
export interface Cotizacion {
  id: number;
  created_at: string;
  numero_cotizacion: string;
  cliente: string;
  fecha: string;
  total: number;
  items: any[]; // Dejamos 'items' como tipo 'any' por ahora
}

@Component({
  selector: 'app-quote-history',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './quote-history.html',
  styleUrls: ['./quote-history.scss']
})
export class QuoteHistoryComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  public cotizaciones: Cotizacion[] = [];
  public isLoading: boolean = true;

  ngOnInit(): void {
    this.getCotizaciones();
  }

  async getCotizaciones(): Promise<void> {
    this.isLoading = true;
    const data = await this.supabaseService.fetchCotizaciones();
    if (data) {
      this.cotizaciones = data as Cotizacion[];
    }
    this.isLoading = false;
  }
}
