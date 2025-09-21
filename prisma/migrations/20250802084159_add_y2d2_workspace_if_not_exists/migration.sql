-- Add y2d2 workspace if it doesn't exist
INSERT INTO "WorkSpace" (name, accessable_ips)
SELECT 'y2d2', ARRAY['58.93.68.7']
WHERE NOT EXISTS (
    SELECT 1 FROM "WorkSpace" WHERE name = 'y2d2'
);