import { Component } from '@angular/core';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [UtilsModule, SidebarComponent],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.css'
})
export class PagosComponent {}
