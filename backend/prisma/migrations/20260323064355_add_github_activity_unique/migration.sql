/*
  Warnings:

  - A unique constraint covering the columns `[repoId,githubId,type]` on the table `GithubActivity` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GithubActivity_repoId_githubId_type_key" ON "GithubActivity"("repoId", "githubId", "type");
