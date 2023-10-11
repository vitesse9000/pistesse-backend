import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddAuditingTable1665147657435 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'audit',
      columns: [{
        name: 'id',
        isPrimary: true,
        isGenerated: true,
        generationStrategy: 'increment',
        type: 'integer',
      }, {
        name: 'entity_id',
        type: 'integer',
      }, {
        // the type of the entity
        name: 'type',
        type: 'varchar',
      }, {
        // the name of the event
        name: 'name',
        type: 'varchar',
      }, {
        name: 'info',
        type: 'json',
      }, {
        name: 'created_at',
        type: 'datetime',
        default: 'NOW()',
      }],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit');
  }
}
