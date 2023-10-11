import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddActivitiesTable1664830381878 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'activities',
      columns: [{
        name: 'id',
        isPrimary: true,
        type: 'integer',
      }, {
        name: 'fetched_at',
        type: 'datetime',
      }, {
        name: 'date',
        type: 'date',
      }, {
        name: 'transponder_id',
        type: 'varchar',
      }, {
        name: 'sessions',
        type: 'json',
      }],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('activities');
  }
}
