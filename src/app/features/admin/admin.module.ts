import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UtilsModule } from '../../utils/utils.module';
import { ResidentesComponent } from './pages/residentes/residentes.component';
import { ContratosComponent } from './pages/contratos/contratos.component';
import { PagosComponent } from './pages/pagos/pagos.component';
import { ComprobantesComponent } from './pages/comprobantes/comprobantes.component';
import { AvisosComponent } from './pages/avisos/avisos.component';
import { ConfiguracionComponent } from './pages/configuracion/configuracion.component';
import { CondominiosComponent } from './pages/condominios/condominios.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';

@NgModule({
  imports: [
    CommonModule,
    UtilsModule,
    DashboardComponent,
    ResidentesComponent,
    ContratosComponent,
    PagosComponent,
    ComprobantesComponent,
    AvisosComponent,
    ConfiguracionComponent,
    CondominiosComponent,
    UsuariosComponent,
    RouterModule.forChild([
      { path: '', component: DashboardComponent },
      { path: 'residentes', component: ResidentesComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'condominios', component: CondominiosComponent },
      { path: 'contratos', component: ContratosComponent },
      { path: 'pagos', component: PagosComponent },
      { path: 'comprobantes', component: ComprobantesComponent },
      { path: 'avisos', component: AvisosComponent },
      { path: 'configuracion', component: ConfiguracionComponent },
    ]),
  ],
  exports: [RouterModule]
})
export class AdminModule { }
