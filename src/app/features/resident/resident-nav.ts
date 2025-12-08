import { NavItem } from '../../utils/sidebar/sidebar.component';

export const RESIDENT_NAV: NavItem[] = [
  { label: 'Inicio', path: '/home', icon: 'home' },
  { label: 'Avisos', path: '/home/avisos', icon: 'campaign' },
  { label: 'Eventos', path: '/home/eventos', icon: 'event' },
  { label: 'Contratos', path: '/home/contratos', icon: 'assignment' },
  { label: 'Pagos', path: '/home/pagos', icon: 'credit_card' },
  { label: 'Mis Datos', path: '/home/perfil', icon: 'account_circle' },
];
