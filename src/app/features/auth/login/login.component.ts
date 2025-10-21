import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UtilsModule } from '../../../utils/utils.module';

@Component({
  selector: 'app-login',
  imports: [UtilsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';

  constructor(private router: Router) {}

  goHome() {
    this.router.navigateByUrl('/home');
  }
}
