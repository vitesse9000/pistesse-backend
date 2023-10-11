import { Json } from '../types/json';

export type InfoType = Record<string, Json>;

export interface AuditableEvent {
  getEntityType(): string;
  getEntityId(): number;
  getName(): string,
  getInfo(): InfoType,
}
