import { EventEmitter } from 'events';
import { EmitterEvents } from '../Types/ControllerTypes';

export class TypedEventEmitter<T extends EmitterEvents> {
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor() {}

  public emit(event: keyof T, ...args: Parameters<T[keyof T]>) {
    this.eventEmitter.emit(event as string, ...args);
  }

  public on(event: keyof T, listener: T[keyof T]) {
    this.eventEmitter.on(event as string, listener);
  }

  public off(event: keyof T, listener: T[keyof T]) {
    this.eventEmitter.off(event as string, listener);
  }

  public removeAllListeners(event: keyof T) {
    this.eventEmitter.removeAllListeners(event as string);
  }

  public setMaxListeners(n: number) {
    this.eventEmitter.setMaxListeners(n);
  }
}
