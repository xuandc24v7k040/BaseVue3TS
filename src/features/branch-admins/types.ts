import type {
  ManagedUserBranchResponseDto,
  ManagedUserResponseDto,
} from "@/api/generated/models";

export type BranchAdmin = ManagedUserResponseDto;

export function isBranchAdminAssignment(
  assignment: ManagedUserBranchResponseDto,
): boolean {
  return assignment.roles.some(({ role }) => role.code === "BRANCH_ADMIN");
}

export type BranchAdminCreateForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  branchIds: string[];
};

export type BranchAdminCreateField = keyof BranchAdminCreateForm;
