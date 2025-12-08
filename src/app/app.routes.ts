import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { loginRedirectGuard } from './core/guards/login-redirect.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule),
    canMatch: [loginRedirectGuard]
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password-page.component').then(m => m.ForgotPasswordPageComponent),
    canMatch: [loginRedirectGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/pages/reset-password/reset-password-page.component').then(m => m.ResetPasswordPageComponent),
    canMatch: [loginRedirectGuard],
  },
  {
    path: 'home',
    loadChildren: () => import('./features/resident/resident.module').then(m => m.ResidentModule),
    canMatch: [authGuard, roleGuard],
    data: { roles: ['RESIDENTE'] },
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
    canMatch: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'OWNER'] },
  },
  // Aliases directos para rutas del sidebar
  { path: 'residentes', redirectTo: 'dashboard/inquilinos', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'inquilinos', redirectTo: 'dashboard/inquilinos', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'propietarios', redirectTo: 'dashboard/propietarios', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN'], strictRoles: true } },
  { path: 'contratos', redirectTo: 'dashboard/contratos', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'pagos', redirectTo: 'dashboard/pagos', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'reportes', redirectTo: 'dashboard/reportes', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'comprobantes', redirectTo: 'dashboard/comprobantes', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'eventos', redirectTo: 'dashboard/eventos', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'avisos', redirectTo: 'dashboard/avisos', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'configuracion', redirectTo: 'dashboard/configuracion', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'condominios', redirectTo: 'dashboard/condominios', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: 'usuarios', redirectTo: 'dashboard/usuarios', pathMatch: 'full', canMatch: [authGuard, roleGuard], data: { roles: ['ADMIN', 'OWNER'] } },
  { path: '**', redirectTo: 'login' },
];
