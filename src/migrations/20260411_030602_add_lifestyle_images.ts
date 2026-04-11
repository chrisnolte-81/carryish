import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_lifestyle_images_context" AS ENUM('kids', 'cargo', 'commute', 'adventure', 'lifestyle');
  CREATE TYPE "public"."enum__products_v_version_lifestyle_images_context" AS ENUM('kids', 'cargo', 'commute', 'adventure', 'lifestyle');
  CREATE TABLE "products_lifestyle_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"context" "enum_products_lifestyle_images_context"
  );

  CREATE TABLE "_products_v_version_lifestyle_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"context" "enum__products_v_version_lifestyle_images_context",
  	"_uuid" varchar
  );

  ALTER TABLE "products_lifestyle_images" ADD CONSTRAINT "products_lifestyle_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_lifestyle_images" ADD CONSTRAINT "products_lifestyle_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_lifestyle_images" ADD CONSTRAINT "_products_v_version_lifestyle_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_lifestyle_images" ADD CONSTRAINT "_products_v_version_lifestyle_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_lifestyle_images_order_idx" ON "products_lifestyle_images" USING btree ("_order");
  CREATE INDEX "products_lifestyle_images_parent_id_idx" ON "products_lifestyle_images" USING btree ("_parent_id");
  CREATE INDEX "products_lifestyle_images_image_idx" ON "products_lifestyle_images" USING btree ("image_id");
  CREATE INDEX "_products_v_version_lifestyle_images_order_idx" ON "_products_v_version_lifestyle_images" USING btree ("_order");
  CREATE INDEX "_products_v_version_lifestyle_images_parent_id_idx" ON "_products_v_version_lifestyle_images" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_lifestyle_images_image_idx" ON "_products_v_version_lifestyle_images" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_lifestyle_images" CASCADE;
  DROP TABLE "_products_v_version_lifestyle_images" CASCADE;
  DROP TYPE "public"."enum_products_lifestyle_images_context";
  DROP TYPE "public"."enum__products_v_version_lifestyle_images_context";`)
}
