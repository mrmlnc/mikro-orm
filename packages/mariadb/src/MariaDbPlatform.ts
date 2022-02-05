import { AbstractSqlPlatform } from '@mikro-orm/knex';
import { MariaDbSchemaHelper } from './MariaDbSchemaHelper';
import { MariaDbExceptionConverter } from './MariaDbExceptionConverter';
import type { Type } from '@mikro-orm/core';
import { expr, Utils } from '@mikro-orm/core';

export class MariaDbPlatform extends AbstractSqlPlatform {

  protected readonly schemaHelper: MariaDbSchemaHelper = new MariaDbSchemaHelper(this);
  protected readonly exceptionConverter = new MariaDbExceptionConverter();

  getDefaultCharset(): string {
    return 'utf8mb4';
  }

  /* istanbul ignore next */
  getSearchJsonPropertyKey(path: string[], type: string): string {
    const [a, ...b] = path;
    return expr(alias => `${this.quoteIdentifier(`${alias}.${a}`)}->'$.${b.join('.')}'`);
  }

  getBooleanTypeDeclarationSQL(): string {
    return 'tinyint(1)';
  }

  getMappedType(type: string): Type<unknown> {
    if (type === 'tinyint(1)') {
      return super.getMappedType('boolean');
    }

    const normalizedType = this.extractSimpleType(type);
    const map = {
      int: 'integer',
      timestamp: 'datetime',
    };

    return super.getMappedType(map[normalizedType] ?? type);
  }

  supportsUnsigned(): boolean {
    return true;
  }

  /**
   * Returns the default name of index for the given columns
   * cannot go past 64 character length for identifiers in MySQL
   */
  getIndexName(tableName: string, columns: string[], type: 'index' | 'unique' | 'foreign' | 'primary' | 'sequence'): string {
    if (type === 'primary') {
      return 'PRIMARY'; // https://dev.mysql.com/doc/refman/8.0/en/create-table.html#create-table-indexes-keys
    }

    let indexName = super.getIndexName(tableName, columns, type);

    /* istanbul ignore next */
    if (indexName.length > 64) {
      indexName = `${indexName.substr(0, 57 - type.length)}_${Utils.hash(indexName).substr(0, 5)}_${type}`;
    }

    return indexName;
  }

}
