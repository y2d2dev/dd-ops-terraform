-- CreateTable
CREATE TABLE "Risk" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Risk_workspaceId_idx" ON "Risk"("workspaceId");

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "WorkSpace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default risks (18 types)
INSERT INTO "Risk" ("workspaceId", "title", "prompt", "description", "createdAt", "updatedAt") VALUES
(NULL, 'COC条項：通知・届出事由', '契約書の条項から、対象会社がその支配権を移転させる場合に、相手方に通知又は届出する義務を負う条項を抽出してください。', '以下の契約について、対象会社は、その支配権を移転させる場合、相手方に通知又は届出する義務を負い、怠った場合、相手方は債務不履行を根拠に契約を終了させることができる。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, 'COC条項：承諾事由', '契約書の条項から、対象会社がその支配権を移転させる場合に、相手方から承諾を得る義務を負う条項を抽出してください。', '以下の契約について、対象会社は、その支配権を移転させる場合、相手方から承諾を得る義務を負い、怠った場合、相手方は債務不履行を根拠に契約を終了させることができる。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, 'COC条項：期限の利益喪失', '契約書の条項から、対象会社がその支配権を移転させる場合に、当然に期限の利益を喪失する条項を抽出してください。', '以下の契約について、対象会社は、その支配権を移転させる場合、当然に期限の利益を喪失する。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, 'COC条項：禁止事由', '契約書の条項から、対象会社の支配権の移転自体が禁止されている条項を抽出してください。', '以下の契約について、対象会社の支配権の移転自体が禁止されているため、対象会社が支配権を移転させた場合、相手方は契約を終了させることができる。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, 'COC条項：解除事由', '契約書の条項から、対象会社がその支配権を移転させた場合に、相手方が当然に契約を解除できる条項を抽出してください。', '以下の契約について、対象会社がその支配権を移転させた場合、相手方は、当然に契約を解除することができる。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, 'COC条項：当然終了事由', '契約書の条項から、対象会社が支配権を移転させた場合に、契約が当然に終了する条項を抽出してください。', '以下の契約について、対象会社が支配権を移転させた場合、契約は当然に終了する。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '相手方に中途解約権を認める条項', '契約書の条項から、相手方が契約期間中であっても契約を中途解約できる条項を抽出してください。', '以下の契約について、相手方は、契約期間中であっても契約を中途解約することができる。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '契約上の地位譲渡制限条項', '契約書の条項から、対象会社が自由に契約上の地位を第三者に譲渡することができない条項を抽出してください。', '以下の契約について、対象会社は、自由に契約上の地位を第三者に譲渡することができない。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '財務制限条項', '契約書の条項から、対象会社が財務指標を所定水準以上に維持する義務を負う条項を抽出してください。', '以下の契約について、対象会社は、財務指標を所定水準以上に維持する義務を負う。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '契約終了時の違約金条項', '契約書の条項から、対象会社が契約期間中に契約を終了させた場合に、相手方に対し違約金を支払う義務を負う条項を抽出してください。', '以下の契約について、対象会社は、契約期間中に契約を終了させた場合、相手方に対し違約金を支払う義務を負う。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '競業避止義務条項', '契約書の条項から、対象会社が一定期間、相手方と競合する事業を行うことができない条項を抽出してください。', '以下の契約について、対象会社は、一定期間、相手方と競合する事業を行うことができない。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '独占的な取引義務条項', '契約書の条項から、対象会社が指定された者と独占的に取引する義務を負い、他の者と同種の取引を行うことができない条項を抽出してください。', '以下の契約について、対象会社は、指定された者と独占的に取引する義務を負い、他の者と同種の取引を行うことができない。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '最低購入数量条項', '契約書の条項から、対象会社が定められた最低数量を購入する義務を負う条項を抽出してください。', '以下の契約について、対象会社は、定められた最低数量を購入する義務を負う。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '品質保証条項', '契約書の条項から、対象会社が製品が一定の品質に適合することを保証する条項を抽出してください。', '以下の契約について、対象会社は、製品が一定の品質に適合することを保証する。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '表明保証違反による損失補償条項', '契約書の条項から、対象会社がその表明保証に違反があった場合に、相手方の損害を補償する義務を負う条項を抽出してください。', '以下の契約について、対象会社は、その表明保証に違反があった場合、相手方の損害を補償する義務を負う。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '追加出資義務条項', '契約書の条項から、対象会社が所定の条件発生時に追加出資を行う義務を負う条項を抽出してください。', '以下の契約について、対象会社は、所定の条件発生時に追加出資を行う義務を負う。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '第三者債務の保証条項', '契約書の条項から、対象会社が第三者の債務を連帯して保証している条項を抽出してください。', '以下の契約について、対象会社は、第三者の債務を連帯して保証している。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(NULL, '第三者債務の担保提供条項', '契約書の条項から、対象会社が第三者の債務を担保するため自社資産に担保権を設定している条項を抽出してください。', '以下の契約について、対象会社は、第三者の債務を担保するため自社資産に担保権を設定している。', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);