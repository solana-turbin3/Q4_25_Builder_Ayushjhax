-- Fix balance records for users who have OnRampTransaction records but no Balance records

-- Insert Balance records for users with successful OnRampTransaction records
INSERT INTO "Balance" ("userId", "amount", "locked", "createdAt", "updatedAt")
SELECT 
    u.id as "userId",
    COALESCE(SUM(CASE WHEN ort.status = 'Success' THEN ort.amount ELSE 0 END), 0) as "amount",
    COALESCE(SUM(CASE WHEN ort.status = 'Pending' THEN ort.amount ELSE 0 END), 0) as "locked",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "User" u
LEFT JOIN "OnRampTransaction" ort ON u.id = ort."userId"
WHERE u.id NOT IN (SELECT "userId" FROM "Balance")
GROUP BY u.id
HAVING COALESCE(SUM(CASE WHEN ort.status = 'Success' THEN ort.amount ELSE 0 END), 0) > 0
   OR COALESCE(SUM(CASE WHEN ort.status = 'Pending' THEN ort.amount ELSE 0 END), 0) > 0;

-- Update existing Balance records to match OnRampTransaction totals
UPDATE "Balance" b
SET 
    "amount" = COALESCE((
        SELECT SUM(ort.amount) 
        FROM "OnRampTransaction" ort 
        WHERE ort."userId" = b."userId" AND ort.status = 'Success'
    ), 0),
    "locked" = COALESCE((
        SELECT SUM(ort.amount) 
        FROM "OnRampTransaction" ort 
        WHERE ort."userId" = b."userId" AND ort.status = 'Pending'
    ), 0),
    "updatedAt" = NOW()
WHERE EXISTS (
    SELECT 1 FROM "OnRampTransaction" ort 
    WHERE ort."userId" = b."userId"
);
