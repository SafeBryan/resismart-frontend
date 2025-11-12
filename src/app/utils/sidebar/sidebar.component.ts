import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { useAvisos } from '../../core/services/avisos-store.service';

export type NavItem = { label: string; path: string; icon?: string };

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
  readonly avisosFacade = useAvisos();

  user$ = this.auth.auth$;

  @Input() title = 'ResiSmart';
  @Input() subtitle = 'Admin';
  @Input() nav: NavItem[] | null = null;

  private readonly defaultNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Eventos', path: '/dashboard/eventos', icon: 'event' },
    { label: 'Residentes', path: '/dashboard/residentes', icon: 'groups' },
    { label: 'Usuarios', path: '/dashboard/usuarios', icon: 'manage_accounts' },
    { label: 'Condominios', path: '/dashboard/condominios', icon: 'holiday_village' },
    { label: 'Contratos', path: '/dashboard/contratos', icon: 'assignment' },
    { label: 'Ordenes de Pago', path: '/dashboard/pagos', icon: 'receipt_long' },
    { label: 'Avisos', path: '/dashboard/avisos', icon: 'campaign' },
    { label: 'Configuracion', path: '/dashboard/configuracion', icon: 'settings' },
  ];

  get navItems(): NavItem[] {
    return this.nav && this.nav.length ? this.nav : this.defaultNav;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
