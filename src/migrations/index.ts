import * as migration_20260408_050106_add_normalized_product_fields from './20260408_050106_add_normalized_product_fields';

export const migrations = [
  {
    up: migration_20260408_050106_add_normalized_product_fields.up,
    down: migration_20260408_050106_add_normalized_product_fields.down,
    name: '20260408_050106_add_normalized_product_fields'
  },
];
