import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UtilsModule } from '../../utils/utils.module';

@NgModule({
  imports: [
    CommonModule,
    UtilsModule,
    DashboardComponent,
    RouterModule.forChild([
      { path: '', component: DashboardComponent },
    ]),
  ],
  exports: [RouterModule]
})
export class AdminModule { }
