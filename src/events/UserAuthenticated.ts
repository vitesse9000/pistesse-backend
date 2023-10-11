import { Service } from '../types/services';
import { AuditableEvent, InfoType } from './AuditableEvent';

export class UserAuthenticated implements AuditableEvent {
  constructor(
    private username: string,
    private userId: number,
    private service: Service,
  ) {}

  getEntityId(): number {
    return this.userId;
  }

  getEntityType(): string {
    return 'user';
  }

  getInfo(): InfoType {
    return {
      service: this.service,
      username: this.username
    };
  }

  getName(): string {
    return 'authenticated';
  }
}
