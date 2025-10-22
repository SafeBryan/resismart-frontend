import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

type NavItem = { label: string; path: string; icon?: string };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  user$ = this.auth.auth$;

  nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Residentes', path: '/dashboard/residentes', icon: 'groups' },
    { label: 'Contratos', path: '/dashboard/contratos', icon: 'assignment' },
    { label: 'Órdenes de Pago', path: '/dashboard/pagos', icon: 'receipt_long' },
    { label: 'Comprobantes', path: '/dashboard/comprobantes', icon: 'receipt' },
    { label: 'Avisos', path: '/dashboard/avisos', icon: 'campaign' },
    { label: 'Configuración', path: '/dashboard/configuracion', icon: 'settings' },
  ];

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
