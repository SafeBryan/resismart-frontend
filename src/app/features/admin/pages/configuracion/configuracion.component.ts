import { Component } from '@angular/core';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [UtilsModule, SidebarComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent {}
