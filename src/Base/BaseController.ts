import { TypedEventEmitter } from '../Helpers/EventEmitterHelpers';
import { EmitterEvents } from '../Types/ControllerTypes';

export class BaseController<
  T extends EmitterEvents | null
> extends TypedEventEmitter<T extends null ? {} : T> {
  constructor() {
    super();
  }
}
