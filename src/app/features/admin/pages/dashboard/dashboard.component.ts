import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  imports: [UtilsModule, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  constructor(private router: Router) {}

  logout() {
    this.router.navigateByUrl('/login');
  }
}
