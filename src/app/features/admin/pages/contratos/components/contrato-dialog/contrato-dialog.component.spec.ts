import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ContratoDialogComponent } from './contrato-dialog.component';
import { ContratoService } from '../../../../../../core/services/contrato.service';
import { CondominiosService } from '../../../../../../core/services/condominios.service';
import { ResidentesService } from '../../../../../../core/services/residentes.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { EstadoContrato } from '../../../../../../core/models/contrato.model';

class ContratoServiceStub {
  create = jasmine.createSpy('create').and.returnValue(of({ id: 10 }));
  update = jasmine.createSpy('update').and.returnValue(of({ id: 10 }));
}

class CondominiosServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of({ content: [] }));
  unidadesPorCondominio = jasmine.createSpy('unidadesPorCondominio').and.returnValue(of([]));
}

class ResidentesServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of([]));
}

class ToastServiceStub {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
}

describe('ContratoDialogComponent', () => {
  let component: ContratoDialogComponent;
  let fixture: ComponentFixture<ContratoDialogComponent>;
  let contratoService: ContratoServiceStub;
  let toast: ToastServiceStub;

  beforeEach(async () => {
    contratoService = new ContratoServiceStub();
    toast = new ToastServiceStub();

    await TestBed.configureTestingModule({
      imports: [ContratoDialogComponent],
      providers: [
        { provide: ContratoService, useValue: contratoService },
        { provide: CondominiosService, useClass: CondominiosServiceStub },
        { provide: ResidentesService, useClass: ResidentesServiceStub },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContratoDialogComponent);
    component = fixture.componentInstance;
  });

  function fillForm(overrides?: Partial<Record<string, any>>) {
    component.form.patchValue({
      idCondominio: 1,
      idUnidad: 7,
      idResidente: 9,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-12-31',
      monto: 1200,
      ...overrides,
    });
  }

  it('should disable the form when viewing an existing contrato', () => {
    component.mode = 'view';
    component.contrato = {
      id: 3,
      idUnidad: 2,
      idResidente: 15,
      fechaInicio: '2024-05-10',
      fechaFin: '2024-11-10',
      monto: 800,
      estado: EstadoContrato.ACTIVO,
    } as any;

    fixture.detectChanges();

    expect(component.form.disabled).toBeTrue();
  });

  it('should not attempt to save when form is invalid', () => {
    component.mode = 'create';
    fixture.detectChanges();

    fillForm({ idUnidad: null });
    expect(component.form.invalid).toBeTrue();

    component.guardar();

    expect(contratoService.create).not.toHaveBeenCalled();
    expect(contratoService.update).not.toHaveBeenCalled();
  });

  it('should create a contrato when form is valid', () => {
    const savedSpy = spyOn(component.saved, 'emit');
    component.mode = 'create';
    fixture.detectChanges();

    fillForm();

    component.guardar();

    expect(contratoService.create).toHaveBeenCalledWith({
      idUnidad: 7,
      idResidente: 9,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-12-31',
      monto: 1200,
    } as any);
    expect(toast.success).toHaveBeenCalledWith('Contrato creado correctamente.');
    expect(savedSpy).toHaveBeenCalled();
  });

  it('should update an existing contrato when in edit mode', () => {
    const savedSpy = spyOn(component.saved, 'emit');
    component.mode = 'edit';
    component.contrato = { id: 55 } as any;
    fixture.detectChanges();

    fillForm({ monto: 1500 });

    component.guardar();

    expect(contratoService.update).toHaveBeenCalledWith(55, {
      idUnidad: 7,
      idResidente: 9,
      fechaInicio: '2025-01-01',
      fechaFin: '2025-12-31',
      monto: 1500,
    } as any);
    expect(toast.success).toHaveBeenCalledWith('Contrato actualizado correctamente.');
    expect(savedSpy).toHaveBeenCalled();
  });
});
