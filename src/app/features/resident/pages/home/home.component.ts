import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsModule } from '../../../../utils/utils.module';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [UtilsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(private router: Router, private auth: AuthService) {}

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
