-- Make email field optional in User table
ALTER TABLE "public"."User" ALTER COLUMN "email" DROP NOT NULL;
