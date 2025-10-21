import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsModule } from '../../../../utils/utils.module';

@Component({
  selector: 'app-home',
  imports: [UtilsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router) {}

  logout() {
    this.router.navigateByUrl('/login');
  }
}
