import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { CondominiosComponent } from './condominios.component';
import { CondominiosService } from '../../../../core/services/condominios.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AvisosStoreService, AvisoItem } from '../../../../core/services/avisos-store.service';

class CondominiosServiceStub {
  list = jasmine.createSpy('list').and.returnValue(
    of({ content: [{ id: 1, nombre: 'Cond A' }, { id: 2, nombre: 'Cond B' }] })
  );
  unidadesPorCondominio = jasmine.createSpy('unidadesPorCondominio').and.returnValue(
    of([{ id: 10, numero: '101', estado: 'LIBRE' }] as any)
  );
  agregarUnidad = jasmine.createSpy('agregarUnidad').and.returnValue(of({}));
  actualizarUnidad = jasmine.createSpy('actualizarUnidad').and.returnValue(of({}));
  eliminarUnidad = jasmine.createSpy('eliminarUnidad').and.returnValue(of({}));
  create = jasmine.createSpy('create').and.returnValue(of({}));
  update = jasmine.createSpy('update').and.returnValue(of({}));
  delete = jasmine.createSpy('delete').and.returnValue(of({}));
}

class UsuariosServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of([]));
}

class AuthServiceStub {
  snapshot = { role: 'ADMIN', idUsuario: 99 };
  auth$ = of({ token: 'jwt' });
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

class ToastServiceStub {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
  confirm = jasmine.createSpy('confirm').and.returnValue(Promise.resolve(true));
}

describe('CondominiosComponent', () => {
  let component: CondominiosComponent;
  let fixture: ComponentFixture<CondominiosComponent>;
  let service: CondominiosServiceStub;
  let toast: ToastServiceStub;

  beforeEach(async () => {
    service = new CondominiosServiceStub();
    toast = new ToastServiceStub();

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CondominiosComponent],
      providers: [
        { provide: CondominiosService, useValue: service },
        { provide: UsuariosService, useClass: UsuariosServiceStub },
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: ToastService, useValue: toast },
        { provide: AvisosStoreService, useClass: AvisosStoreServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CondominiosComponent);
    component = fixture.componentInstance;
  });

  it('should load condominios and select the first one on init', () => {
    fixture.detectChanges();

    expect(service.list).toHaveBeenCalled();
    expect(component.selectedId()).toBe(1);
    expect(service.unidadesPorCondominio).toHaveBeenCalledWith(1);
    expect(component.unidades().length).toBe(1);
  });

  it('should open edit unidad modal and submit updates', () => {
    fixture.detectChanges();
    component.selectedId.set(1);
    const unidad = { id: 10, numero: '101', estado: 'LIBRE' } as any;

    component.openEditUnidad(unidad);

    expect(component.showEditUnidad()).toBeTrue();
    expect(component.editUnidadForm.value).toEqual({ numero: '101', estado: 'LIBRE' });

    component.editUnidadForm.patchValue({ numero: '102', estado: 'OCUPADA' });
    service.unidadesPorCondominio.calls.reset();
    component.submitEditUnidad();

    expect(service.actualizarUnidad).toHaveBeenCalledWith(10, { numero: '102', estado: 'OCUPADA' });
    expect(service.unidadesPorCondominio).toHaveBeenCalledWith(1);
    expect(toast.success).toHaveBeenCalledWith('Unidad actualizada correctamente.');
    expect(component.showEditUnidad()).toBeFalse();
    expect(component.editingUnidadId).toBeNull();
  });
});
