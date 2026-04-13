-- AlterTable
ALTER TABLE "clients" ADD COLUMN "promo_group_deep_link_used" BOOLEAN NOT NULL DEFAULT false;

-- Уже активировавшие промо-группу по deep link считаем как пришедшие с промоссылки
UPDATE "clients" c
SET "promo_group_deep_link_used" = true
WHERE EXISTS (
  SELECT 1 FROM "promo_activations" pa WHERE pa.client_id = c.id
);
