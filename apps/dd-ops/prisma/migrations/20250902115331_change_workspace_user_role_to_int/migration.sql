-- カラム型を変更
ALTER TABLE "WorkspaceUser" ALTER COLUMN "role" SET DEFAULT 1;
ALTER TABLE "WorkspaceUser" ALTER COLUMN "role" TYPE INTEGER USING "role"::integer;