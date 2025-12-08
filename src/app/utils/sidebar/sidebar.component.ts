import { Component, Input, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { useAvisos } from '../../core/services/avisos-store.service';
import { normalizeRole } from '../../core/utils/role.util';
import { environment } from '../../../environments/environment';
import { CondominioContextService } from '../../core/services/condominio-context.service';

export type NavItem = { label: string; path: string; icon?: string };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private condCtx = inject(CondominioContextService);
  readonly avisosFacade = useAvisos();

  user$ = this.auth.auth$;
  showCondoSelector = false;
  readonly condominios = computed(() => this.condCtx.state().condominios ?? []);
  readonly condominioActual = this.condCtx.condominioActual;
  readonly canSwitch = computed(() => {
    const role = normalizeRole(this.auth.snapshot.role);
    return role === 'ADMIN' || role === 'OWNER';
  });

  @Input() title = 'ResiSmart';
  @Input() subtitle = 'Admin';
  @Input() nav: NavItem[] | null = null;

  ngOnInit(): void {
    if (this.canSwitch()) {
      this.condCtx.ensureLoaded().subscribe();
    } else {
      this.showCondoSelector = false;
    }
  }

  private readonly defaultNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Condominios', path: '/dashboard/condominios', icon: 'apartment' },
    { label: 'Pagos', path: '/dashboard/pagos', icon: 'receipt_long' },
    { label: 'Eventos', path: '/dashboard/eventos', icon: 'event' },
    { label: 'Contratos', path: '/dashboard/contratos', icon: 'assignment' },
    { label: 'Propietarios', path: '/dashboard/propietarios', icon: 'manage_accounts' },
    { label: 'Inquilinos', path: '/dashboard/inquilinos', icon: 'groups' },
    { label: 'Reportes', path: '/dashboard/reportes', icon: 'bar_chart' },
    { label: 'Configuracion', path: '/dashboard/configuracion', icon: 'settings' },
  ];

  get navItems(): NavItem[] {
    const base = this.nav && this.nav.length ? this.nav : this.defaultNav;
    const role = normalizeRole(this.auth.snapshot.role);
    return base.filter((item) => {
      if (role === 'ADMIN' && ['Dashboard', 'Reportes', 'Pagos'].includes(item.label)) {
        return false;
      }
      if (item.label === 'Propietarios') {
        return role === 'ADMIN';
      }
      if (item.label === 'Condominios') {
        return role === 'ADMIN' || role === 'OWNER';
      }
      return true;
    });
  }

  get avatarUrl(): string {
    const auth = this.auth.snapshot as any;
    const url = auth?.profile?.avatarUrl ?? auth?.avatarUrl ?? null;
    if (!url || typeof url !== 'string') {
      return 'assets/img/default-user.png';
    }
    if (url.startsWith('http')) {
      return url;
    }
    const base = environment.apiUrl || '';
    if (url.startsWith('/files')) {
      return `${base}${url}`;
    }
    if (url.startsWith('/')) {
      return `${base}${url}`;
    }
    return `${base}/files/${url}`;
  }

  get condominioNombre(): string {
    const c = this.condCtx.condominioActual();
    if (c?.nombre) return c.nombre;
    return this.title || 'ResiSmart';
  }

  get condominioSubtitle(): string {
    const c = this.condCtx.condominioActual();
    if (c?.direccion) return c.direccion;
    if (this.subtitle) return this.subtitle;
    return 'Selecciona un condominio para ver su información';
  }

  get condominioLogoUrl(): string {
    const c = this.condCtx.condominioActual();
    const url = (c as any)?.logoUrl;
    if (!url) return `${environment.apiUrl}/files/defaults/default-condominio-logo.png`;
    if (typeof url === 'string' && url.startsWith('http')) return url;
    const base = environment.apiUrl || '';
    if (url.startsWith('/files')) return `${base}${url}`;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/files/${url}`;
  }

  get condominioPortadaUrl(): string {
    const c = this.condCtx.condominioActual();
    const url = (c as any)?.portadaUrl;
    if (!url) return `${environment.apiUrl}/files/defaults/default-condominio-portada.png`;
    if (typeof url === 'string' && url.startsWith('http')) return url;
    const base = environment.apiUrl || '';
    if (url.startsWith('/files')) return `${base}${url}`;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/files/${url}`;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  toggleCondoSelector(event?: Event) {
    if (!this.canSwitch()) return;
    event?.preventDefault();
    event?.stopPropagation();
    this.showCondoSelector = !this.showCondoSelector;
    if (this.showCondoSelector && this.condominios().length === 0) {
      this.condCtx.ensureLoaded().subscribe();
    }
  }

  selectCondominio(id?: number | null) {
    if (!this.canSwitch()) return;
    const nextId = id != null ? Number(id) : null;
    this.condCtx.setCondominioActual(nextId);
    this.showCondoSelector = false;
  }

  trackById(_: number, item: any) {
    return item?.id ?? _;
  }

  condominioLogo(c: any): string {
    const url = c?.logoUrl;
    if (!url) return `${environment.apiUrl}/files/defaults/default-condominio-logo.png`;
    if (typeof url === 'string' && url.startsWith('http')) return url;
    const base = environment.apiUrl || '';
    if (url.startsWith('/files')) return `${base}${url}`;
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/files/${url}`;
  }
}
