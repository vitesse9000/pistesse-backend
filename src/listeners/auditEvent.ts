import { Log } from '../entities/Log';
import { AuditableEvent } from '../events/AuditableEvent';
import { getRepository } from '../services/repo';

export default async (event: AuditableEvent): Promise<void> => {
  const repo = await getRepository(Log);

  const log = repo.create();
  log.type = event.getEntityType();
  log.entityId = event.getEntityId();
  log.name = event.getName();
  log.info = event.getInfo();

  await repo.save(log);
};
