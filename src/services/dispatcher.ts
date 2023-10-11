import { EventEmitter } from 'events';
import { AuditableEvent } from '../events/AuditableEvent';
import { UserAuthenticated } from '../events/UserAuthenticated';
import auditEvent from '../listeners/auditEvent';

export const emitter = new EventEmitter();

type Listener<T extends AuditableEvent> = (event: T) => void | Promise<void>;

type Config = {
  name: string,
  listeners: Listener<any>[],
}[];

const events: Config = [{
  name: UserAuthenticated.name,
  listeners: [
    auditEvent,
  ],
}];

events.forEach(({ name, listeners }) => {
  listeners.forEach((listener) => emitter.addListener(name, listener));
});
