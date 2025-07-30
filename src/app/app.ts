import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastsComponent } from "./components/toasts/toasts";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('cotizador-OF');
}
