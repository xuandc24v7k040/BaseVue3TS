export const customerAccountKeys = {
  all: ["customer-account"] as const,
  profile: () => [...customerAccountKeys.all, "profile"] as const,
  addresses: () => [...customerAccountKeys.all, "addresses"] as const,
};
