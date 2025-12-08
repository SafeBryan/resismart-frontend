import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { HomeComponent } from './home.component';
import { AuthService } from '../../../../core/services/auth.service';
import { EventosService } from '../../../../core/services/eventos.service';
import { OrdenesPagoService } from '../../../../core/services/ordenes-pago.service';
import { DocumentosService } from '../../../../core/services/documentos.service';
import { ResidentContextService } from '../../../../core/services/resident-context.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ResidentContext } from '../../../../core/models/resident-context.model';
import { AvisosStoreService } from '../../../../core/services/avisos-store.service';
import { AvisoItem } from '../../../../core/services/avisos-store.service';

class AuthServiceStub {
  auth$ = of({ token: 'jwt' });
  snapshot = { idUsuario: 1, profile: {} };
}

class EventosServiceStub {
  confirmarAsistencia = jasmine.createSpy('confirmarAsistencia').and.returnValue(of(void 0));
  listByCondominio = jasmine.createSpy('listByCondominio').and.returnValue(of([]));
}

class OrdenesPagoServiceStub {
  listByContratos = jasmine.createSpy('listByContratos').and.returnValue(of([]));
}

class DocumentosServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of([]));
}

class ResidentContextServiceStub {
  context = signal<ResidentContext>({
    userId: 1,
    contratos: [],
    condominioIds: [],
    loading: false,
  });
}

class ToastServiceStub {
  success = jasmine.createSpy('success');
  error = jasmine.createSpy('error');
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

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HomeComponent],
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: EventosService, useClass: EventosServiceStub },
        { provide: OrdenesPagoService, useClass: OrdenesPagoServiceStub },
        { provide: DocumentosService, useClass: DocumentosServiceStub },
        { provide: ResidentContextService, useClass: ResidentContextServiceStub },
        { provide: ToastService, useClass: ToastServiceStub },
        { provide: AvisosStoreService, useClass: AvisosStoreServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
