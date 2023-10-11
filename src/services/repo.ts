import { EntityTarget, Repository, ObjectLiteral } from 'typeorm';
import database from './database';

export const getRepository = async <T extends ObjectLiteral>(target: EntityTarget<T>): Promise<Repository<T>> => {
  if (!database.isInitialized) {
    await database.initialize();
  }

  return database.getRepository(target);
};
