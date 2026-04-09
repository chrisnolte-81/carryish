import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_power_type" AS ENUM('electric', 'non-electric', 'pedal-assist');
   CREATE TYPE "public"."enum__products_v_version_power_type" AS ENUM('electric', 'non-electric', 'pedal-assist');
   ALTER TABLE "products" ADD COLUMN "power_type" "enum_products_power_type" DEFAULT 'electric';
   ALTER TABLE "_products_v" ADD COLUMN "version_power_type" "enum__products_v_version_power_type" DEFAULT 'electric';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "power_type";
   ALTER TABLE "_products_v" DROP COLUMN "version_power_type";
   DROP TYPE "public"."enum_products_power_type";
   DROP TYPE "public"."enum__products_v_version_power_type";`)
}
