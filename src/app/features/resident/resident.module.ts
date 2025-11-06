import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UtilsModule } from '../../utils/utils.module';
import { HomeComponent } from './pages/home/home.component';
import { ResidentAvisosComponent } from './pages/avisos/avisos.component';
import { ResidentContratosComponent } from './pages/contratos/contratos.component';
import { ResidentComprobantesComponent } from './pages/comprobantes/comprobantes.component';
import { ResidentPerfilComponent } from './pages/perfil/perfil.component';

@NgModule({
  imports: [
    CommonModule,
    UtilsModule,
    HomeComponent,
    ResidentAvisosComponent,
    ResidentContratosComponent,
    ResidentComprobantesComponent,
    ResidentPerfilComponent,
    RouterModule.forChild([
      { path: '', component: HomeComponent },
      { path: 'avisos', component: ResidentAvisosComponent },
      { path: 'contratos', component: ResidentContratosComponent },
      { path: 'comprobantes', component: ResidentComprobantesComponent },
      { path: 'perfil', component: ResidentPerfilComponent },
      { path: '**', redirectTo: '' },
    ]),
  ],
  exports: [RouterModule]
})
export class ResidentModule { }
