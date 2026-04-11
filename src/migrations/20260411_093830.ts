import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_gallery_component_details_component" AS ENUM('motor', 'battery', 'display', 'brakes', 'drivetrain', 'suspension', 'rack', 'kickstand', 'lights', 'fold', 'lock', 'wheels', 'cockpit', 'seat', 'child-seat', 'other');
  CREATE TYPE "public"."enum_products_gallery_lifestyle_images_context" AS ENUM('kids', 'cargo', 'commute', 'adventure', 'lifestyle');
  CREATE TYPE "public"."enum_products_key_accessories_category" AS ENUM('child-seat', 'pannier', 'rack', 'rain-cover', 'running-board', 'safety-rail', 'lock', 'trailer-hitch', 'battery', 'other');
  CREATE TYPE "public"."enum__products_v_version_gallery_component_details_component" AS ENUM('motor', 'battery', 'display', 'brakes', 'drivetrain', 'suspension', 'rack', 'kickstand', 'lights', 'fold', 'lock', 'wheels', 'cockpit', 'seat', 'child-seat', 'other');
  CREATE TYPE "public"."enum__products_v_version_gallery_lifestyle_images_context" AS ENUM('kids', 'cargo', 'commute', 'adventure', 'lifestyle');
  CREATE TYPE "public"."enum__products_v_version_key_accessories_category" AS ENUM('child-seat', 'pannier', 'rack', 'rain-cover', 'running-board', 'safety-rail', 'lock', 'trailer-hitch', 'battery', 'other');
  CREATE TABLE "products_color_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"color_name" varchar,
  	"color_hex" varchar,
  	"hero_image_id" integer,
  	"angle_image_id" integer
  );
  
  CREATE TABLE "products_gallery_component_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"component" "enum_products_gallery_component_details_component",
  	"caption" varchar
  );
  
  CREATE TABLE "products_gallery_lifestyle_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"context" "enum_products_gallery_lifestyle_images_context",
  	"caption" varchar
  );
  
  CREATE TABLE "products_certifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "products_key_accessories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price" numeric,
  	"description" varchar,
  	"category" "enum_products_key_accessories_category",
  	"included" boolean
  );
  
  CREATE TABLE "_products_v_version_color_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"color_name" varchar,
  	"color_hex" varchar,
  	"hero_image_id" integer,
  	"angle_image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_gallery_component_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"component" "enum__products_v_version_gallery_component_details_component",
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_gallery_lifestyle_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"context" "enum__products_v_version_gallery_lifestyle_images_context",
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_certifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_key_accessories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price" numeric,
  	"description" varchar,
  	"category" "enum__products_v_version_key_accessories_category",
  	"included" boolean,
  	"_uuid" varchar
  );
  
  INSERT INTO "products_gallery_lifestyle_images" ("_order", "_parent_id", "id", "image_id", "caption", "context")
  SELECT "_order", "_parent_id", "id", "image_id", "caption", "context"::text::"public"."enum_products_gallery_lifestyle_images_context"
  FROM "products_lifestyle_images";
  INSERT INTO "_products_v_version_gallery_lifestyle_images" ("_order", "_parent_id", "id", "image_id", "caption", "context", "_uuid")
  SELECT "_order", "_parent_id", "id", "image_id", "caption", "context"::text::"public"."enum__products_v_version_gallery_lifestyle_images_context", "_uuid"
  FROM "_products_v_version_lifestyle_images";
  SELECT setval(pg_get_serial_sequence('_products_v_version_gallery_lifestyle_images', 'id'), COALESCE((SELECT MAX("id") FROM "_products_v_version_gallery_lifestyle_images"), 1));
  DROP TABLE "products_lifestyle_images" CASCADE;
  DROP TABLE "_products_v_version_lifestyle_images" CASCADE;
  ALTER TABLE "products" ADD COLUMN "subtitle" varchar;
  ALTER TABLE "products" ADD COLUMN "generation" varchar;
  ALTER TABLE "products" ADD COLUMN "model_family" varchar;
  ALTER TABLE "products" ADD COLUMN "currently_available" boolean DEFAULT true;
  ALTER TABLE "_products_v" ADD COLUMN "version_subtitle" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_generation" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_model_family" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_currently_available" boolean DEFAULT true;
  ALTER TABLE "products_color_options" ADD CONSTRAINT "products_color_options_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_color_options" ADD CONSTRAINT "products_color_options_angle_image_id_media_id_fk" FOREIGN KEY ("angle_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_color_options" ADD CONSTRAINT "products_color_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_gallery_component_details" ADD CONSTRAINT "products_gallery_component_details_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_gallery_component_details" ADD CONSTRAINT "products_gallery_component_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_gallery_lifestyle_images" ADD CONSTRAINT "products_gallery_lifestyle_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_gallery_lifestyle_images" ADD CONSTRAINT "products_gallery_lifestyle_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_certifications" ADD CONSTRAINT "products_certifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_key_accessories" ADD CONSTRAINT "products_key_accessories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_color_options" ADD CONSTRAINT "_products_v_version_color_options_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_color_options" ADD CONSTRAINT "_products_v_version_color_options_angle_image_id_media_id_fk" FOREIGN KEY ("angle_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_color_options" ADD CONSTRAINT "_products_v_version_color_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery_component_details" ADD CONSTRAINT "_products_v_version_gallery_component_details_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery_component_details" ADD CONSTRAINT "_products_v_version_gallery_component_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery_lifestyle_images" ADD CONSTRAINT "_products_v_version_gallery_lifestyle_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_gallery_lifestyle_images" ADD CONSTRAINT "_products_v_version_gallery_lifestyle_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_certifications" ADD CONSTRAINT "_products_v_version_certifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_key_accessories" ADD CONSTRAINT "_products_v_version_key_accessories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_color_options_order_idx" ON "products_color_options" USING btree ("_order");
  CREATE INDEX "products_color_options_parent_id_idx" ON "products_color_options" USING btree ("_parent_id");
  CREATE INDEX "products_color_options_hero_image_idx" ON "products_color_options" USING btree ("hero_image_id");
  CREATE INDEX "products_color_options_angle_image_idx" ON "products_color_options" USING btree ("angle_image_id");
  CREATE INDEX "products_gallery_component_details_order_idx" ON "products_gallery_component_details" USING btree ("_order");
  CREATE INDEX "products_gallery_component_details_parent_id_idx" ON "products_gallery_component_details" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_component_details_image_idx" ON "products_gallery_component_details" USING btree ("image_id");
  CREATE INDEX "products_gallery_lifestyle_images_order_idx" ON "products_gallery_lifestyle_images" USING btree ("_order");
  CREATE INDEX "products_gallery_lifestyle_images_parent_id_idx" ON "products_gallery_lifestyle_images" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_lifestyle_images_image_idx" ON "products_gallery_lifestyle_images" USING btree ("image_id");
  CREATE INDEX "products_certifications_order_idx" ON "products_certifications" USING btree ("_order");
  CREATE INDEX "products_certifications_parent_id_idx" ON "products_certifications" USING btree ("_parent_id");
  CREATE INDEX "products_key_accessories_order_idx" ON "products_key_accessories" USING btree ("_order");
  CREATE INDEX "products_key_accessories_parent_id_idx" ON "products_key_accessories" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_color_options_order_idx" ON "_products_v_version_color_options" USING btree ("_order");
  CREATE INDEX "_products_v_version_color_options_parent_id_idx" ON "_products_v_version_color_options" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_color_options_hero_image_idx" ON "_products_v_version_color_options" USING btree ("hero_image_id");
  CREATE INDEX "_products_v_version_color_options_angle_image_idx" ON "_products_v_version_color_options" USING btree ("angle_image_id");
  CREATE INDEX "_products_v_version_gallery_component_details_order_idx" ON "_products_v_version_gallery_component_details" USING btree ("_order");
  CREATE INDEX "_products_v_version_gallery_component_details_parent_id_idx" ON "_products_v_version_gallery_component_details" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_gallery_component_details_image_idx" ON "_products_v_version_gallery_component_details" USING btree ("image_id");
  CREATE INDEX "_products_v_version_gallery_lifestyle_images_order_idx" ON "_products_v_version_gallery_lifestyle_images" USING btree ("_order");
  CREATE INDEX "_products_v_version_gallery_lifestyle_images_parent_id_idx" ON "_products_v_version_gallery_lifestyle_images" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_gallery_lifestyle_images_image_idx" ON "_products_v_version_gallery_lifestyle_images" USING btree ("image_id");
  CREATE INDEX "_products_v_version_certifications_order_idx" ON "_products_v_version_certifications" USING btree ("_order");
  CREATE INDEX "_products_v_version_certifications_parent_id_idx" ON "_products_v_version_certifications" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_key_accessories_order_idx" ON "_products_v_version_key_accessories" USING btree ("_order");
  CREATE INDEX "_products_v_version_key_accessories_parent_id_idx" ON "_products_v_version_key_accessories" USING btree ("_parent_id");
  DROP TYPE "public"."enum_products_lifestyle_images_context";
  DROP TYPE "public"."enum__products_v_version_lifestyle_images_context";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
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
  
  DROP TABLE "products_color_options" CASCADE;
  DROP TABLE "products_gallery_component_details" CASCADE;
  DROP TABLE "products_gallery_lifestyle_images" CASCADE;
  DROP TABLE "products_certifications" CASCADE;
  DROP TABLE "products_key_accessories" CASCADE;
  DROP TABLE "_products_v_version_color_options" CASCADE;
  DROP TABLE "_products_v_version_gallery_component_details" CASCADE;
  DROP TABLE "_products_v_version_gallery_lifestyle_images" CASCADE;
  DROP TABLE "_products_v_version_certifications" CASCADE;
  DROP TABLE "_products_v_version_key_accessories" CASCADE;
  ALTER TABLE "products_lifestyle_images" ADD CONSTRAINT "products_lifestyle_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_lifestyle_images" ADD CONSTRAINT "products_lifestyle_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_lifestyle_images" ADD CONSTRAINT "_products_v_version_lifestyle_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_lifestyle_images" ADD CONSTRAINT "_products_v_version_lifestyle_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_lifestyle_images_order_idx" ON "products_lifestyle_images" USING btree ("_order");
  CREATE INDEX "products_lifestyle_images_parent_id_idx" ON "products_lifestyle_images" USING btree ("_parent_id");
  CREATE INDEX "products_lifestyle_images_image_idx" ON "products_lifestyle_images" USING btree ("image_id");
  CREATE INDEX "_products_v_version_lifestyle_images_order_idx" ON "_products_v_version_lifestyle_images" USING btree ("_order");
  CREATE INDEX "_products_v_version_lifestyle_images_parent_id_idx" ON "_products_v_version_lifestyle_images" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_lifestyle_images_image_idx" ON "_products_v_version_lifestyle_images" USING btree ("image_id");
  ALTER TABLE "products" DROP COLUMN "subtitle";
  ALTER TABLE "products" DROP COLUMN "generation";
  ALTER TABLE "products" DROP COLUMN "model_family";
  ALTER TABLE "products" DROP COLUMN "currently_available";
  ALTER TABLE "_products_v" DROP COLUMN "version_subtitle";
  ALTER TABLE "_products_v" DROP COLUMN "version_generation";
  ALTER TABLE "_products_v" DROP COLUMN "version_model_family";
  ALTER TABLE "_products_v" DROP COLUMN "version_currently_available";
  DROP TYPE "public"."enum_products_gallery_component_details_component";
  DROP TYPE "public"."enum_products_gallery_lifestyle_images_context";
  DROP TYPE "public"."enum_products_key_accessories_category";
  DROP TYPE "public"."enum__products_v_version_gallery_component_details_component";
  DROP TYPE "public"."enum__products_v_version_gallery_lifestyle_images_context";
  DROP TYPE "public"."enum__products_v_version_key_accessories_category";`)
}
