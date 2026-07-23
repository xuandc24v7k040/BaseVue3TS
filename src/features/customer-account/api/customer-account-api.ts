import type {
  ChangeCustomerPasswordDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerProfileDto,
} from "@/api/generated/models";
import {
  customerAccountChangePassword,
  customerAccountProfile,
  customerAccountRemoveAvatar,
  customerAccountUpdateProfile,
  customerAccountUploadAvatar,
} from "@/api/generated/endpoints/customer-account/customer-account";
import {
  customerAddressesCreate,
  customerAddressesDelete,
  customerAddressesList,
  customerAddressesSetDefault,
  customerAddressesUpdate,
} from "@/api/generated/endpoints/customer-addresses/customer-addresses";

export async function getCustomerProfile(signal?: AbortSignal) {
  return (await customerAccountProfile(undefined, signal)).data;
}

export async function updateCustomerProfile(payload: UpdateCustomerProfileDto) {
  return (await customerAccountUpdateProfile(payload)).data;
}

export async function uploadCustomerAvatar(file: Blob) {
  return (await customerAccountUploadAvatar({ file })).data;
}

export async function removeCustomerAvatar() {
  return (await customerAccountRemoveAvatar()).data;
}

export async function changeCustomerPassword(
  payload: ChangeCustomerPasswordDto,
) {
  return (await customerAccountChangePassword(payload)).data;
}

export async function listCustomerAddresses(signal?: AbortSignal) {
  return (await customerAddressesList(undefined, signal)).data;
}

export async function createCustomerAddress(payload: CreateCustomerAddressDto) {
  return (await customerAddressesCreate(payload)).data;
}

export async function updateCustomerAddress(
  id: string,
  payload: UpdateCustomerAddressDto,
) {
  return (await customerAddressesUpdate(id, payload)).data;
}

export async function setDefaultCustomerAddress(id: string) {
  return (await customerAddressesSetDefault(id)).data;
}

export async function deleteCustomerAddress(id: string) {
  return (await customerAddressesDelete(id)).data;
}
