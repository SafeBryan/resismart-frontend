import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './pages/home/home.component';
import { RouterModule } from '@angular/router';
import { ButtonComponent } from '../../utils/button/button.component';

@NgModule({
  imports: [
    CommonModule,
    ButtonComponent,
    HomeComponent,
    RouterModule.forChild([
      { path: '', component: HomeComponent },
    ]),
  ],
  exports: [RouterModule]
})
export class ResidentModule { }
