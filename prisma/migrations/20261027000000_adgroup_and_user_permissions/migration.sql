-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "FranchiseEnquiry" ADD COLUMN     "utmAdgroupName" TEXT;

-- Existing users keep exactly the access their role gave them before module permissions existed.
UPDATE "AdminUser" SET "permissions" = ARRAY['content.manage', 'media.manage'] WHERE "role" = 'CONTENT_EDITOR';
UPDATE "AdminUser" SET "permissions" = ARRAY['enquiries.read', 'enquiries.update', 'enquiries.export'] WHERE "role" = 'ENQUIRY_MANAGER';
