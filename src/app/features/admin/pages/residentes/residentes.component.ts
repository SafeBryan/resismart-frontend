import { Component } from '@angular/core';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';

@Component({
  selector: 'app-residentes',
  standalone: true,
  imports: [UtilsModule, SidebarComponent],
  templateUrl: './residentes.component.html',
  styleUrl: './residentes.component.css'
})
export class ResidentesComponent {}
