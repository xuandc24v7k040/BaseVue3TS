import { describe, expect, it } from "vitest";
import { authLogin } from "@/api/generated/endpoints/auth/auth";
import type { LoginDto } from "@/api/generated/models";
import {
  AuthLoginBody,
  AuthRegisterBody,
} from "@/api/generated/zod/auth/auth";
import { BranchesListHeader } from "@/api/generated/zod/branches/branches";
import {
  StaffCreateBody,
  StaffListHeader,
  StaffRemoveBranchBody,
  StaffTransferBranchBody,
} from "@/api/generated/zod/staff/staff";
import { UsersFindOneParams } from "@/api/generated/zod/users/users";

const VALID_ULID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const VALID_ULID_TWO = "01BRZ3NDEKTSV4RRFFQ69G5FAV";

function expectInvalid(
  schema: { safeParse: (value: unknown) => { success: boolean } },
  value: unknown,
) {
  expect(schema.safeParse(value).success).toBe(false);
}

describe("generated Zod schemas", () => {
  it("exports generated endpoint, model, and Zod modules", () => {
    const payload: LoginDto = {
      email: "admin@bookora.test",
      password: "Password1",
    };

    expect(typeof authLogin).toBe("function");
    expect(AuthLoginBody.parse(payload)).toEqual(payload);
  });

  it("validates required ULID path parameters", () => {
    expect(UsersFindOneParams.parse({ id: VALID_ULID })).toEqual({
      id: VALID_ULID,
    });

    expectInvalid(UsersFindOneParams, { id: "abc" });
    expectInvalid(UsersFindOneParams, { id: VALID_ULID.slice(0, 25) });
    expectInvalid(UsersFindOneParams, { id: `${VALID_ULID}A` });
    expectInvalid(UsersFindOneParams, { id: "01ARZ3NDEKTSV4RRIQ69G5FAV" });
    expectInvalid(UsersFindOneParams, { id: "01ARZ3NDEKTSV4RRLQ69G5FAV" });
    expectInvalid(UsersFindOneParams, { id: "01ARZ3NDEKTSV4RROQ69G5FAV" });
    expectInvalid(UsersFindOneParams, { id: "01ARZ3NDEKTSV4RRUQ69G5FAV" });
    expectInvalid(UsersFindOneParams, {});
  });

  it("validates required and optional X-Branch-Id headers", () => {
    expect(StaffListHeader.parse({ "X-Branch-Id": VALID_ULID })).toEqual({
      "X-Branch-Id": VALID_ULID,
    });
    expectInvalid(StaffListHeader, {});
    expectInvalid(StaffListHeader, { "X-Branch-Id": "abc" });

    expect(BranchesListHeader.parse({})).toEqual({});
    expect(BranchesListHeader.parse({ "X-Branch-Id": VALID_ULID })).toEqual({
      "X-Branch-Id": VALID_ULID,
    });
  });

  it("validates ULID arrays and minItems constraints", () => {
    const validTransfer = {
      fromBranchId: VALID_ULID,
      toBranchId: VALID_ULID_TWO,
      destinationRoleIds: [VALID_ULID],
    };

    expect(StaffTransferBranchBody.parse(validTransfer)).toEqual(validTransfer);
    expectInvalid(StaffTransferBranchBody, {
      ...validTransfer,
      destinationRoleIds: ["abc"],
    });
    expectInvalid(StaffTransferBranchBody, {
      ...validTransfer,
      destinationRoleIds: [],
    });

    const duplicateRoles = {
      ...validTransfer,
      destinationRoleIds: [VALID_ULID, VALID_ULID],
    };

    expect(StaffTransferBranchBody.safeParse(duplicateRoles).success).toBe(
      true,
    );
  });

  it("validates optional ULID request fields", () => {
    expect(StaffRemoveBranchBody.parse({})).toEqual({});
    expect(
      StaffRemoveBranchBody.parse({ replacementBranchId: VALID_ULID }),
    ).toEqual({
      replacementBranchId: VALID_ULID,
    });
    expectInvalid(StaffRemoveBranchBody, { replacementBranchId: "abc" });
  });

  it("validates auth email, password, and optional turnstileToken constraints", () => {
    const loginPayload = {
      email: "admin@bookora.test",
      password: "Password1",
    };

    expect(AuthLoginBody.parse(loginPayload)).toEqual(loginPayload);
    expect(
      AuthLoginBody.parse({ ...loginPayload, turnstileToken: "token" }),
    ).toEqual({
      ...loginPayload,
      turnstileToken: "token",
    });
    expectInvalid(AuthLoginBody, { ...loginPayload, email: "not-an-email" });
    expectInvalid(AuthLoginBody, { ...loginPayload, password: "Pass1" });
    expectInvalid(AuthLoginBody, { ...loginPayload, password: "12345678" });
    expectInvalid(AuthLoginBody, { ...loginPayload, password: "Password" });
  });

  it("validates register and staff creation request constraints", () => {
    expect(
      AuthRegisterBody.parse({
        email: "admin@bookora.test",
        fullName: "Bookora Admin",
        password: "Password1",
      }),
    ).toEqual({
      email: "admin@bookora.test",
      fullName: "Bookora Admin",
      password: "Password1",
    });
    expectInvalid(AuthRegisterBody, {
      email: "admin@bookora.test",
      fullName: "A",
      password: "Password1",
    });

    const staffPayload = {
      email: "staff@bookora.test",
      fullName: "Staff User",
      password: "Password1",
      roleIds: [VALID_ULID],
    };

    expect(StaffCreateBody.parse(staffPayload)).toEqual(staffPayload);
    expectInvalid(StaffCreateBody, { ...staffPayload, roleIds: [] });
    expectInvalid(StaffCreateBody, { ...staffPayload, roleIds: ["abc"] });
    expectInvalid(StaffCreateBody, { ...staffPayload, permissionIds: ["abc"] });
  });
});
