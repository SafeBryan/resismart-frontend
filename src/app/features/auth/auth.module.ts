import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login.component';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../utils/button/button.component';
import { InputTextComponent } from '../../utils/input-text/input-text.component';
import { InputPasswordComponent } from '../../utils/input-password/input-password.component';

@NgModule({
  imports: [
    CommonModule,
    // Standalone UI utils
    ButtonComponent,
    InputTextComponent,
    InputPasswordComponent,
    LoginComponent,
    RouterModule.forChild([
      { path: '', component: LoginComponent },
    ]),
  ],
  exports: [RouterModule]
})
export class AuthModule { }
