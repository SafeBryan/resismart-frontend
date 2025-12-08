import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './utils/toast/toast-container.component';
import { AsyncPipe, NgIf } from '@angular/common';
import { LoadingOverlayComponent } from './shared/ui/loading-overlay/loading-overlay.component';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, AsyncPipe, NgIf, LoadingOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'resismart-frontend';
  readonly loading$ = inject(LoadingService).loading$;
}
