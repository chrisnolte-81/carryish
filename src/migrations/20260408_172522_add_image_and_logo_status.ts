import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_brands_logo_status" AS ENUM('needs-logo', 'placeholder', 'uploaded');
  CREATE TYPE "public"."enum_products_image_status" AS ENUM('needs-images', 'scraped', 'editorial', 'placeholder');
  CREATE TYPE "public"."enum__products_v_version_image_status" AS ENUM('needs-images', 'scraped', 'editorial', 'placeholder');
  ALTER TABLE "brands" ADD COLUMN "logo_status" "enum_brands_logo_status" DEFAULT 'needs-logo';
  ALTER TABLE "products" ADD COLUMN "image_status" "enum_products_image_status" DEFAULT 'needs-images';
  ALTER TABLE "_products_v" ADD COLUMN "version_image_status" "enum__products_v_version_image_status" DEFAULT 'needs-images';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brands" DROP COLUMN "logo_status";
  ALTER TABLE "products" DROP COLUMN "image_status";
  ALTER TABLE "_products_v" DROP COLUMN "version_image_status";
  DROP TYPE "public"."enum_brands_logo_status";
  DROP TYPE "public"."enum_products_image_status";
  DROP TYPE "public"."enum__products_v_version_image_status";`)
}
