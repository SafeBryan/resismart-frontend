import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

class AuthServiceStub {
  snapshot: any = { idUsuario: null };
  login = jasmine.createSpy('login').and.returnValue(of({ token: 'jwt' } as any));
  fetchUserById = jasmine.createSpy('fetchUserById').and.returnValue(of({}));
  validateToken = jasmine.createSpy('validateToken').and.returnValue(of(true));
  getRole = jasmine.createSpy('getRole').and.returnValue(null);
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  let navigateSpy: jasmine.Spy;
  let toast: jasmine.SpyObj<ToastService>;
  let auth: AuthServiceStub;

  beforeEach(async () => {
    auth = new AuthServiceStub();
    toast = jasmine.createSpyObj('ToastService', ['show', 'dismiss', 'error', 'success', 'info']);
    toast.show.and.returnValue(1);

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should block login when credentials are missing', () => {
    component.email = '';
    component.password = '';

    component.goHome();

    expect(auth.login).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Ingresa tu correo y contrasena para continuar.');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should login admins, sync profile, and go to dashboard', () => {
    auth.snapshot = { idUsuario: 77 };
    auth.getRole.and.returnValue('ADMIN');
    component.email = ' admin@mail.com ';
    component.password = 'secret';

    component.goHome();

    expect(auth.login).toHaveBeenCalledWith('admin@mail.com', 'secret');
    expect(auth.fetchUserById).toHaveBeenCalledWith(77);
    expect(auth.validateToken).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('Perfil sincronizado correctamente.');
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/administrador/));
    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
    expect(toast.dismiss).toHaveBeenCalledWith(1);
  });

  it('should validate token and send residents to home', () => {
    auth.snapshot = { idUsuario: null };
    auth.getRole.and.returnValue('RESIDENTE');
    component.email = 'resident@mail.com';
    component.password = 'pwd';

    component.goHome();

    expect(auth.fetchUserById).not.toHaveBeenCalled();
    expect(auth.validateToken).toHaveBeenCalledWith(true);
    expect(navigateSpy).toHaveBeenCalledWith('/home');
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/residente/));
  });

  it('should surface backend errors when login fails', () => {
    const backendError = { status: 401 };
    auth.login.and.returnValue(throwError(() => backendError));
    component.email = 'fail@mail.com';
    component.password = 'bad';

    component.goHome();

    expect(toast.dismiss).toHaveBeenCalledWith(1);
    expect(toast.error).toHaveBeenCalledWith('Credenciales invalidas. Verifica tu correo y contrasena.');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
