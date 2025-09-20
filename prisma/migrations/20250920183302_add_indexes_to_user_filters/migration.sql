-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE INDEX "User_roleIntent_idx" ON "public"."User"("roleIntent");

-- CreateIndex
CREATE INDEX "User_heardFrom_idx" ON "public"."User"("heardFrom");
