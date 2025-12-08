import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { ContratosComponent } from './contratos.component';
import { ContratoService } from '../../../../core/services/contrato.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AvisosStoreService, AvisoItem } from '../../../../core/services/avisos-store.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { ResidentesService } from '../../../../core/services/residentes.service';

class ContratoServiceStub {
  listAll = jasmine.createSpy('listAll').and.returnValue(of([]));
  filterLocal = jasmine.createSpy('filterLocal').and.callFake((data) => data);
  buildStats = jasmine.createSpy('buildStats').and.returnValue({
    total: 0,
    activos: 0,
    proximosAVencer: 0,
    ingresosMensuales: 0,
  });
  renovar = jasmine.createSpy('renovar').and.returnValue(of({}));
  rescindir = jasmine.createSpy('rescindir').and.returnValue(of({}));
  delete = jasmine.createSpy('delete').and.returnValue(of({}));
}

class ToastServiceStub {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  confirm = jasmine.createSpy('confirm').and.returnValue(Promise.resolve(true));
  show = jasmine.createSpy('show').and.returnValue(1);
  dismiss = jasmine.createSpy('dismiss');
}

class AuthServiceStub {
  snapshot = { role: 'ADMIN', idUsuario: 1 };
  auth$ = of({ token: 'jwt' });
  logout = jasmine.createSpy('logout');
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

class CondominiosServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of({ content: [] }));
  unidadesPorCondominio = jasmine.createSpy('unidadesPorCondominio').and.returnValue(of([]));
  agregarUnidad = jasmine.createSpy('agregarUnidad');
  actualizarUnidad = jasmine.createSpy('actualizarUnidad');
  eliminarUnidad = jasmine.createSpy('eliminarUnidad');
}

class ResidentesServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of([]));
}

describe('ContratosComponent', () => {
  let component: ContratosComponent;
  let fixture: ComponentFixture<ContratosComponent>;
  let contratoService: ContratoServiceStub;

  beforeEach(async () => {
    contratoService = new ContratoServiceStub();

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ContratosComponent],
      providers: [
        { provide: ContratoService, useValue: contratoService },
        { provide: ToastService, useClass: ToastServiceStub },
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: AvisosStoreService, useClass: AvisosStoreServiceStub },
        { provide: CondominiosService, useClass: CondominiosServiceStub },
        { provide: ResidentesService, useClass: ResidentesServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContratosComponent);
    component = fixture.componentInstance;
  });

  it('should sort contratos by fechaInicio when loading data', () => {
    const list = [
      { id: 1, fechaInicio: '2024-01-01' },
      { id: 2, fechaInicio: '2024-06-15' },
      { id: 3, fechaInicio: '2023-12-12' },
    ] as any[];
    contratoService.listAll.and.returnValue(of(list));

    fixture.detectChanges();

    expect(component.data()[0]?.id).toBe(2);
    expect(component.data()[1]?.id).toBe(1);
    expect(component.data()[2]?.id).toBe(3);
  });

  it('should open create dialog when abrirDetalle is called', () => {
    fixture.detectChanges();

    component.abrirDetalle();

    expect(component.dialogVisible()).toBeTrue();
    expect(component.dialogMode()).toBe('create');
    expect(component.dialogContrato()).toBeNull();
  });

  it('should set dialog state to view when abrirDetalleExistente is called', () => {
    const contrato = { id: 9 } as any;
    fixture.detectChanges();

    component.abrirDetalleExistente(contrato);

    expect(component.dialogVisible()).toBeTrue();
    expect(component.dialogMode()).toBe('view');
    expect(component.dialogContrato()).toBe(contrato);
  });

  it('should reload data after dialog save', () => {
    contratoService.listAll.and.returnValue(of([]));
    fixture.detectChanges();
    contratoService.listAll.calls.reset();

    component.onDialogSaved({});

    expect(component.dialogVisible()).toBeFalse();
    expect(contratoService.listAll).toHaveBeenCalled();
  });

  it('should renovar contrato when user provides new fecha', () => {
    contratoService.listAll.and.returnValue(of([]));
    fixture.detectChanges();
    spyOn(window, 'prompt').and.returnValue('2026-01-01');

    const contrato = { id: 77, fechaFin: '2025-01-01' } as any;
    component.confirmarRenovar(contrato);

    expect(contratoService.renovar).toHaveBeenCalledWith(77, { nuevaFechaFin: '2026-01-01' });
  });
});
