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
import { EventosComponent } from './pages/eventos/eventos.component';
import { PropietariosComponent } from './pages/propietarios/propietarios.component';
import { ReportesComponent } from './pages/reportes/reportes.component';
import { roleGuard } from '../../core/guards/role.guard';

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
    EventosComponent,
    PropietariosComponent,
    ReportesComponent,
    RouterModule.forChild([
      { path: '', component: DashboardComponent },
      { path: 'residentes', redirectTo: 'inquilinos', pathMatch: 'full' },
      { path: 'inquilinos', component: ResidentesComponent },
      { path: 'usuarios', component: UsuariosComponent },
      { path: 'condominios', component: CondominiosComponent },
      { path: 'contratos', component: ContratosComponent },
      { path: 'pagos', component: PagosComponent },
      { path: 'pagos/:id', component: PagosComponent, canMatch: [roleGuard], data: { roles: ['ADMIN', 'OWNER'], strictRoles: true } },
      { path: 'comprobantes', component: ComprobantesComponent },
      { path: 'avisos', component: AvisosComponent },
      { path: 'eventos', component: EventosComponent },
      { path: 'propietarios', component: PropietariosComponent, canMatch: [roleGuard], data: { roles: ['ADMIN'], strictRoles: true } },
      { path: 'reportes', component: ReportesComponent },
      { path: 'configuracion', component: ConfiguracionComponent },
    ]),
  ],
  exports: [RouterModule]
})
export class AdminModule { }
