import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_product_status" AS ENUM('in-stock', 'pre-order', 'discontinued', 'coming-soon', 'b2b-only');
  CREATE TYPE "public"."enum__products_v_version_product_status" AS ENUM('in-stock', 'pre-order', 'discontinued', 'coming-soon', 'b2b-only');
  CREATE TABLE "products_pros" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_cons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_not_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "_products_v_version_pros" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_cons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_not_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products" ADD COLUMN "tagline" varchar;
  ALTER TABLE "products" ADD COLUMN "one_liner" varchar;
  ALTER TABLE "products" ADD COLUMN "verdict" varchar;
  ALTER TABLE "products" ADD COLUMN "comparison_context" varchar;
  ALTER TABLE "products" ADD COLUMN "msrp_to" numeric;
  ALTER TABLE "products" ADD COLUMN "price_note" varchar;
  ALTER TABLE "products" ADD COLUMN "product_status" "enum_products_product_status" DEFAULT 'in-stock';
  ALTER TABLE "products" ADD COLUMN "cheaper_alternative_id" integer;
  ALTER TABLE "products" ADD COLUMN "premium_alternative_id" integer;
  ALTER TABLE "products" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "products" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "products_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_tagline" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_one_liner" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_verdict" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_comparison_context" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_msrp_to" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_price_note" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_product_status" "enum__products_v_version_product_status" DEFAULT 'in-stock';
  ALTER TABLE "_products_v" ADD COLUMN "version_cheaper_alternative_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_premium_alternative_id" integer;
  ALTER TABLE "_products_v" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_meta_description" varchar;
  ALTER TABLE "_products_v_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "products_pros" ADD CONSTRAINT "products_pros_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_cons" ADD CONSTRAINT "products_cons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_not_for" ADD CONSTRAINT "products_not_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_faq" ADD CONSTRAINT "products_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_pros" ADD CONSTRAINT "_products_v_version_pros_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_cons" ADD CONSTRAINT "_products_v_version_cons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_not_for" ADD CONSTRAINT "_products_v_version_not_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_faq" ADD CONSTRAINT "_products_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_pros_order_idx" ON "products_pros" USING btree ("_order");
  CREATE INDEX "products_pros_parent_id_idx" ON "products_pros" USING btree ("_parent_id");
  CREATE INDEX "products_cons_order_idx" ON "products_cons" USING btree ("_order");
  CREATE INDEX "products_cons_parent_id_idx" ON "products_cons" USING btree ("_parent_id");
  CREATE INDEX "products_not_for_order_idx" ON "products_not_for" USING btree ("_order");
  CREATE INDEX "products_not_for_parent_id_idx" ON "products_not_for" USING btree ("_parent_id");
  CREATE INDEX "products_faq_order_idx" ON "products_faq" USING btree ("_order");
  CREATE INDEX "products_faq_parent_id_idx" ON "products_faq" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_pros_order_idx" ON "_products_v_version_pros" USING btree ("_order");
  CREATE INDEX "_products_v_version_pros_parent_id_idx" ON "_products_v_version_pros" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_cons_order_idx" ON "_products_v_version_cons" USING btree ("_order");
  CREATE INDEX "_products_v_version_cons_parent_id_idx" ON "_products_v_version_cons" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_not_for_order_idx" ON "_products_v_version_not_for" USING btree ("_order");
  CREATE INDEX "_products_v_version_not_for_parent_id_idx" ON "_products_v_version_not_for" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_faq_order_idx" ON "_products_v_version_faq" USING btree ("_order");
  CREATE INDEX "_products_v_version_faq_parent_id_idx" ON "_products_v_version_faq" USING btree ("_parent_id");
  ALTER TABLE "products" ADD CONSTRAINT "products_cheaper_alternative_id_products_id_fk" FOREIGN KEY ("cheaper_alternative_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_premium_alternative_id_products_id_fk" FOREIGN KEY ("premium_alternative_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_cheaper_alternative_id_products_id_fk" FOREIGN KEY ("version_cheaper_alternative_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_premium_alternative_id_products_id_fk" FOREIGN KEY ("version_premium_alternative_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_cheaper_alternative_idx" ON "products" USING btree ("cheaper_alternative_id");
  CREATE INDEX "products_premium_alternative_idx" ON "products" USING btree ("premium_alternative_id");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  CREATE INDEX "_products_v_version_version_cheaper_alternative_idx" ON "_products_v" USING btree ("version_cheaper_alternative_id");
  CREATE INDEX "_products_v_version_version_premium_alternative_idx" ON "_products_v" USING btree ("version_premium_alternative_id");
  CREATE INDEX "_products_v_rels_products_id_idx" ON "_products_v_rels" USING btree ("products_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_pros" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_cons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_not_for" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_pros" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_cons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_not_for" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_faq" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_pros" CASCADE;
  DROP TABLE "products_cons" CASCADE;
  DROP TABLE "products_not_for" CASCADE;
  DROP TABLE "products_faq" CASCADE;
  DROP TABLE "_products_v_version_pros" CASCADE;
  DROP TABLE "_products_v_version_cons" CASCADE;
  DROP TABLE "_products_v_version_not_for" CASCADE;
  DROP TABLE "_products_v_version_faq" CASCADE;
  ALTER TABLE "products" DROP CONSTRAINT "products_cheaper_alternative_id_products_id_fk";
  
  ALTER TABLE "products" DROP CONSTRAINT "products_premium_alternative_id_products_id_fk";
  
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_products_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_cheaper_alternative_id_products_id_fk";
  
  ALTER TABLE "_products_v" DROP CONSTRAINT "_products_v_version_premium_alternative_id_products_id_fk";
  
  ALTER TABLE "_products_v_rels" DROP CONSTRAINT "_products_v_rels_products_fk";
  
  DROP INDEX "products_cheaper_alternative_idx";
  DROP INDEX "products_premium_alternative_idx";
  DROP INDEX "products_rels_products_id_idx";
  DROP INDEX "_products_v_version_version_cheaper_alternative_idx";
  DROP INDEX "_products_v_version_version_premium_alternative_idx";
  DROP INDEX "_products_v_rels_products_id_idx";
  ALTER TABLE "products" DROP COLUMN "tagline";
  ALTER TABLE "products" DROP COLUMN "one_liner";
  ALTER TABLE "products" DROP COLUMN "verdict";
  ALTER TABLE "products" DROP COLUMN "comparison_context";
  ALTER TABLE "products" DROP COLUMN "msrp_to";
  ALTER TABLE "products" DROP COLUMN "price_note";
  ALTER TABLE "products" DROP COLUMN "product_status";
  ALTER TABLE "products" DROP COLUMN "cheaper_alternative_id";
  ALTER TABLE "products" DROP COLUMN "premium_alternative_id";
  ALTER TABLE "products" DROP COLUMN "meta_title";
  ALTER TABLE "products" DROP COLUMN "meta_description";
  ALTER TABLE "products_rels" DROP COLUMN "products_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_tagline";
  ALTER TABLE "_products_v" DROP COLUMN "version_one_liner";
  ALTER TABLE "_products_v" DROP COLUMN "version_verdict";
  ALTER TABLE "_products_v" DROP COLUMN "version_comparison_context";
  ALTER TABLE "_products_v" DROP COLUMN "version_msrp_to";
  ALTER TABLE "_products_v" DROP COLUMN "version_price_note";
  ALTER TABLE "_products_v" DROP COLUMN "version_product_status";
  ALTER TABLE "_products_v" DROP COLUMN "version_cheaper_alternative_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_premium_alternative_id";
  ALTER TABLE "_products_v" DROP COLUMN "version_meta_title";
  ALTER TABLE "_products_v" DROP COLUMN "version_meta_description";
  ALTER TABLE "_products_v_rels" DROP COLUMN "products_id";
  DROP TYPE "public"."enum_products_product_status";
  DROP TYPE "public"."enum__products_v_version_product_status";`)
}
