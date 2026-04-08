import * as migration_20260408_050106_add_normalized_product_fields from './20260408_050106_add_normalized_product_fields';
import * as migration_20260408_172522_add_image_and_logo_status from './20260408_172522_add_image_and_logo_status';

export const migrations = [
  {
    up: migration_20260408_050106_add_normalized_product_fields.up,
    down: migration_20260408_050106_add_normalized_product_fields.down,
    name: '20260408_050106_add_normalized_product_fields',
  },
  {
    up: migration_20260408_172522_add_image_and_logo_status.up,
    down: migration_20260408_172522_add_image_and_logo_status.down,
    name: '20260408_172522_add_image_and_logo_status'
  },
];
