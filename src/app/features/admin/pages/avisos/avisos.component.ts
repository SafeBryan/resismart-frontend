import { Component } from '@angular/core';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';

@Component({
  selector: 'app-avisos',
  standalone: true,
  imports: [UtilsModule, SidebarComponent],
  templateUrl: './avisos.component.html',
  styleUrl: './avisos.component.css'
})
export class AvisosComponent {}
