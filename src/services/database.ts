import { DataSource, DataSourceOptions } from 'typeorm';

const config = {
  type: 'sqlite',
  database: process.env.MYSQL_DATABASE ?? 'storage/db.sqlite',
  logging: process.env.NODE_ENV === 'production' ? ['error', 'info']: false,
  entities: ['src/entities/Activity.ts', 'src/entities/Log.ts'],
  subscribers: ['src/listeners/*Subscriber.ts'],
  synchronize: false,
  migrationsRun: false,
  migrations: ['src/migrations/*.ts'],
} as DataSourceOptions;

const source = new DataSource(config);

export default source;
