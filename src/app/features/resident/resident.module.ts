import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UtilsModule } from '../../utils/utils.module';
import { HomeComponent } from './pages/home/home.component';
import { ResidentAvisosComponent } from './pages/avisos/avisos.component';
import { ResidentContratosComponent } from './pages/contratos/contratos.component';
import { ResidentPerfilComponent } from './pages/perfil/perfil.component';
import { ResidentEventosComponent } from './pages/eventos/resident-eventos.component';
import { ResidentPaymentsPageComponent } from './pages/payments/resident-payments-page.component';

@NgModule({
  imports: [
    CommonModule,
    UtilsModule,
    HomeComponent,
    ResidentAvisosComponent,
    ResidentContratosComponent,
    ResidentPerfilComponent,
    ResidentEventosComponent,
    ResidentPaymentsPageComponent,
    RouterModule.forChild([
      { path: '', component: HomeComponent },
      { path: 'avisos', component: ResidentAvisosComponent },
      { path: 'contratos', component: ResidentContratosComponent },
      { path: 'eventos', component: ResidentEventosComponent },
      { path: 'pagos', component: ResidentPaymentsPageComponent },
      { path: 'perfil', component: ResidentPerfilComponent },
      { path: '**', redirectTo: '' },
    ]),
  ],
  exports: [RouterModule]
})
export class ResidentModule { }
