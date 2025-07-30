import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [NgbToastModule, NgFor],
  templateUrl: './toasts.html',
  host: {
    class: 'toast-container position-fixed top-0 end-0 p-3',
    style: 'z-index: 1200',
  },
})
export class ToastsComponent {
  toastService = inject(ToastService);
}
