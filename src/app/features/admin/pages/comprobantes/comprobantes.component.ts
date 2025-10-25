import { Component } from '@angular/core';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';

@Component({
  selector: 'app-comprobantes',
  standalone: true,
  imports: [UtilsModule, SidebarComponent],
  templateUrl: './comprobantes.component.html',
  styleUrl: './comprobantes.component.css'
})
export class ComprobantesComponent {}
