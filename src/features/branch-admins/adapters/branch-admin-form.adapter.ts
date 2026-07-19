import type { CreateInternalUserDto } from "@/api/generated/models";
import type { ValidBranchAdminCreateForm } from "../schemas/branch-admin-create.schema";

export function toCreateBranchAdminPayload(
  form: ValidBranchAdminCreateForm,
): CreateInternalUserDto {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    password: form.password,
    branchIds: [...form.branchIds],
  };
}
