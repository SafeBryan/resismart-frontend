import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$: Observable<boolean> = this.loadingSubject.asObservable();

  show(): void {
    this.counter++;
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
    }
  }

  hide(): void {
    this.counter = Math.max(0, this.counter - 1);
    if (this.counter === 0 && this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
  }
}
