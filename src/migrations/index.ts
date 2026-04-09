import * as migration_20260408_050106_add_normalized_product_fields from './20260408_050106_add_normalized_product_fields';
import * as migration_20260408_172522_add_image_and_logo_status from './20260408_172522_add_image_and_logo_status';
import * as migration_20260409_124415_add_enrichment_fields from './20260409_124415_add_enrichment_fields';
import * as migration_20260409_200000_add_power_type from './20260409_200000_add_power_type';

export const migrations = [
  {
    up: migration_20260408_050106_add_normalized_product_fields.up,
    down: migration_20260408_050106_add_normalized_product_fields.down,
    name: '20260408_050106_add_normalized_product_fields',
  },
  {
    up: migration_20260408_172522_add_image_and_logo_status.up,
    down: migration_20260408_172522_add_image_and_logo_status.down,
    name: '20260408_172522_add_image_and_logo_status',
  },
  {
    up: migration_20260409_124415_add_enrichment_fields.up,
    down: migration_20260409_124415_add_enrichment_fields.down,
    name: '20260409_124415_add_enrichment_fields',
  },
  {
    up: migration_20260409_200000_add_power_type.up,
    down: migration_20260409_200000_add_power_type.down,
    name: '20260409_200000_add_power_type',
  },
];
