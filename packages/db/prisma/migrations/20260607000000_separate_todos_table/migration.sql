-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_userId_date_idx" ON "Todo"("userId", "date");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: copy existing todos from FocusSession.todos JSON into Todo table
INSERT INTO "Todo" ("id", "userId", "date", "text", "done", "createdAt")
SELECT
    gen_random_uuid()::text,
    fs."userId",
    fs."date",
    t->>'text',
    (t->>'done')::boolean,
    CURRENT_TIMESTAMP
FROM "FocusSession" fs
CROSS JOIN jsonb_array_elements(fs."todos"::jsonb) AS t
WHERE fs."todos" IS NOT NULL
  AND fs."todos"::text != '[]'
  AND fs."todos"::text != 'null';

-- AlterTable: remove todos column from FocusSession
ALTER TABLE "FocusSession" DROP COLUMN "todos";
