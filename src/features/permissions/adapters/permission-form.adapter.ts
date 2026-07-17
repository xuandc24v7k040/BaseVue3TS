import type {
  CreatePermissionDto,
  UpdatePermissionDto,
} from "@/api/generated/models";
import type { Permission, PermissionFormState } from "../types";
import type { PermissionFormData } from "../schemas/permission-form.schema";

export function emptyPermissionForm(): PermissionFormState {
  return {
    code: "",
    name: "",
    resource: "",
    action: "",
    guardName: "web",
    description: "",
  };
}

export function permissionToForm(permission: Permission): PermissionFormState {
  return {
    code: permission.code,
    name: permission.name,
    resource: permission.resource,
    action: permission.action,
    guardName: permission.guardName,
    description: permission.description ?? "",
  };
}

export function toCreatePermissionPayload(
  value: PermissionFormData,
): CreatePermissionDto {
  return {
    code: value.code,
    name: value.name,
    resource: value.resource,
    action: value.action,
    guardName: value.guardName,
    description: value.description || null,
  };
}

export function toUpdatePermissionPayload(
  value: PermissionFormData,
  original: Permission,
): UpdatePermissionDto {
  const payload: UpdatePermissionDto = {};
  if (value.code !== original.code) payload.code = value.code;
  if (value.name !== original.name) payload.name = value.name;
  if (value.resource !== original.resource) payload.resource = value.resource;
  if (value.action !== original.action) payload.action = value.action;
  if (value.guardName !== original.guardName)
    payload.guardName = value.guardName;
  if (value.description !== (original.description ?? ""))
    payload.description = value.description || null;
  return payload;
}
