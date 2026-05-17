-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_postId_userId_emoji_key" ON "CommunityReaction"("postId", "userId", "emoji");
