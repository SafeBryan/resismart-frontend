import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AvisosStoreService, AvisoItem } from '../../../../core/services/avisos-store.service';
import { DashboardData, DashboardFilters } from '../../../../core/models/dashboard.model';

class DashboardServiceStub {
  loadDashboardData = jasmine.createSpy('loadDashboardData').and.callFake((filters: DashboardFilters) =>
    of<DashboardData>({
      kpis: {
        totalOrdenes: 0,
        pendientes: 0,
        pagadas: 0,
        vencidas: 0,
        enMora: 0,
        conComprobante: 0,
      },
      ordenes: [],
      documentos: [],
      actividad: [],
      filtros: filters,
    })
  );

  getIngresosMensuales = jasmine.createSpy('getIngresosMensuales').and.returnValue(
    of([{ mes: '2025-01', montoTotal: 0 }])
  );
}

class CondominiosServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of({ content: [] }));
  unidadesPorCondominio = jasmine.createSpy('unidadesPorCondominio').and.returnValue(of([]));
}

class AuthServiceStub {
  auth$ = of({ token: 'jwt' });
  snapshot = { idUsuario: 1, profile: {} };
}

class AvisosStoreServiceStub {
  avisos = signal<AvisoItem[]>([]);
  unreadCount = signal(0);
  loading = signal(false);
  error = signal<string | null>(null);
  ack = jasmine.createSpy('ack');
  markAllVisible = jasmine.createSpy('markAllVisible');
  navigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
  refresh = jasmine.createSpy('refresh');
}

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, DashboardComponent],
      providers: [
        { provide: DashboardService, useClass: DashboardServiceStub },
        { provide: CondominiosService, useClass: CondominiosServiceStub },
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: AvisosStoreService, useClass: AvisosStoreServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
