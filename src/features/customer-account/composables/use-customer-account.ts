import { useQuery } from "@tanstack/vue-query";
import { computed, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";
import {
  getCustomerProfile,
  listCustomerAddresses,
} from "../api/customer-account-api";
import { customerAccountKeys } from "../api/customer-account-query-keys";

export function useCustomerProfile() {
  return useQuery({
    queryKey: customerAccountKeys.profile(),
    queryFn: ({ signal }) => getCustomerProfile(signal),
  });
}

export function useCustomerAddresses(options?: {
  enabled?: MaybeRefOrGetter<boolean>;
}) {
  return useQuery({
    queryKey: customerAccountKeys.addresses(),
    queryFn: ({ signal }) => listCustomerAddresses(signal),
    enabled: computed(() => toValue(options?.enabled ?? true)),
  });
}
