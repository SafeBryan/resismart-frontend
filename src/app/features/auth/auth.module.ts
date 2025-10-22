import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login.component';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../utils/button/button.component';
import { InputComponent } from '../../utils/input/input.component';

@NgModule({
  imports: [
    CommonModule,
    // Standalone UI utils
    ButtonComponent,
    InputComponent,
    LoginComponent,
    RouterModule.forChild([
      { path: '', component: LoginComponent },
    ]),
  ],
  exports: [RouterModule]
})
export class AuthModule { }
