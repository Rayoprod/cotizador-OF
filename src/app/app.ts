import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router'; // <-- AÑADIR RouterModule
import { ToastsComponent } from "./components/toasts/toasts";
import { CommonModule } from '@angular/common';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap'; // <-- IMPORTA ESTO

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastsComponent,CommonModule,RouterModule,NgbCollapseModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('cotizador-OF');
    isMenuCollapsed = true; // <-- AÑADE ESTA LÍNEA

}
