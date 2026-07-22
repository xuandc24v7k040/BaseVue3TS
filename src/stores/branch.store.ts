import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type {
  AuthMeBranchAssignmentDto,
  AuthMeBranchDto,
  AuthMeResponseDto,
  AuthMeResponseDtoType,
} from "@/api/generated/models";
import { changeBranchQueryScope } from "@/api/branch-query-cache";
import { STORAGE_KEYS } from "@/constants/storage-key.constant";
import { queryClient } from "@/lib/query-client";
import { canChangeBranch } from "@/stores/branch-change-guard";

interface PersistedAdminBranchContext {
  userId: string;
  branchId: string | null;
}

function readPersistedContext(): PersistedAdminBranchContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adminBranchContext);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const { userId, branchId } = parsed as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      (branchId !== null && typeof branchId !== "string")
    ) {
      return null;
    }

    return { userId, branchId };
  } catch {
    return null;
  }
}

function writePersistedContext(context: PersistedAdminBranchContext): void {
  localStorage.setItem(
    STORAGE_KEYS.adminBranchContext,
    JSON.stringify(context),
  );
}

export const useBranchStore = defineStore("admin-branch-context", () => {
  const selectedBranchId = ref<string | null>(null);
  const availableBranches = ref<AuthMeBranchDto[]>([]);
  const assignments = ref<AuthMeBranchAssignmentDto[]>([]);
  const globalPermissions = ref<string[]>([]);
  const principalId = ref<string | null>(null);
  const principalType = ref<AuthMeResponseDtoType | null>(null);
  const isInitialized = ref(false);

  const selectedBranch = computed<AuthMeBranchDto | null>(() => {
    return (
      availableBranches.value.find(({ id }) => id === selectedBranchId.value) ??
      null
    );
  });

  const selectedAssignment = computed<AuthMeBranchAssignmentDto | null>(() => {
    return (
      assignments.value.find(
        ({ branchId }) => branchId === selectedBranchId.value,
      ) ?? null
    );
  });

  const effectivePermissions = computed<string[]>(() => {
    if (principalType.value === "SYSTEM") return globalPermissions.value;
    return selectedAssignment.value?.permissions ?? [];
  });

  const isSystemScope = computed(() => {
    return principalType.value === "SYSTEM" && selectedBranchId.value === null;
  });

  const scopeLabel = computed(() => {
    if (isSystemScope.value) return "Toàn hệ thống";
    return selectedBranch.value?.name ?? "Chưa được phân công chi nhánh";
  });

  function persist(): void {
    if (!principalId.value) return;
    writePersistedContext({
      userId: principalId.value,
      branchId: selectedBranchId.value,
    });
  }

  function reset(options: { clearPersistence?: boolean } = {}): void {
    selectedBranchId.value = null;
    availableBranches.value = [];
    assignments.value = [];
    globalPermissions.value = [];
    principalId.value = null;
    principalType.value = null;
    isInitialized.value = false;

    if (options.clearPersistence ?? true) {
      localStorage.removeItem(STORAGE_KEYS.adminBranchContext);
    }
  }

  function initialize(principal: AuthMeResponseDto): void {
    const persisted = readPersistedContext();
    const persistedBranchId =
      persisted?.userId === principal.id ? persisted.branchId : null;

    principalId.value = principal.id;
    principalType.value = principal.type;
    globalPermissions.value = [...principal.globalPermissions];

    if (principal.type === "SYSTEM") {
      assignments.value = [];
      availableBranches.value = [...principal.branches];
      selectedBranchId.value =
        persistedBranchId !== null &&
        availableBranches.value.some(({ id }) => id === persistedBranchId)
          ? persistedBranchId
          : null;
    } else if (principal.type === "BRANCH") {
      const activeBranchIds = new Set(principal.branches.map(({ id }) => id));
      assignments.value = principal.branchAssignments.filter((assignment) => {
        return assignment.isActive && activeBranchIds.has(assignment.branchId);
      });
      availableBranches.value = assignments.value.map(({ branch }) => branch);

      const persistedIsValid =
        persisted?.userId === principal.id &&
        persisted.branchId !== null &&
        assignments.value.some(
          ({ branchId }) => branchId === persisted.branchId,
        );
      const primaryIsValid =
        principal.primaryBranchId !== null &&
        assignments.value.some(
          ({ branchId }) => branchId === principal.primaryBranchId,
        );

      selectedBranchId.value = persistedIsValid
        ? persisted.branchId
        : primaryIsValid
          ? principal.primaryBranchId
          : (assignments.value[0]?.branchId ?? null);
    } else {
      assignments.value = [];
      availableBranches.value = [];
      selectedBranchId.value = null;
    }

    isInitialized.value = true;

    if (principal.type === "SYSTEM" || principal.type === "BRANCH") {
      persist();
    } else {
      localStorage.removeItem(STORAGE_KEYS.adminBranchContext);
    }
  }

  async function setSelectedBranch(branchId: string | null): Promise<boolean> {
    if (!isInitialized.value || !principalId.value) return false;
    if (branchId === null && principalType.value !== "SYSTEM") return false;
    if (
      branchId !== null &&
      !availableBranches.value.some(({ id }) => id === branchId)
    ) {
      return false;
    }

    const previousBranchId = selectedBranchId.value;
    if (previousBranchId === branchId) {
      persist();
      return true;
    }

    if (!(await canChangeBranch(branchId))) return false;

    await changeBranchQueryScope(
      queryClient,
      previousBranchId,
      branchId,
      () => {
        selectedBranchId.value = branchId;
        persist();
      },
    );
    return true;
  }

  async function clearSelectedBranch(): Promise<void> {
    if (!isInitialized.value || !principalId.value) return;
    const previousBranchId = selectedBranchId.value;
    if (previousBranchId === null) {
      persist();
      return;
    }

    if (!(await canChangeBranch(null))) return;

    await changeBranchQueryScope(queryClient, previousBranchId, null, () => {
      selectedBranchId.value = null;
      persist();
    });
  }

  return {
    selectedBranchId,
    selectedBranch,
    selectedAssignment,
    effectivePermissions,
    isSystemScope,
    isInitialized,
    availableBranches,
    scopeLabel,
    initialize,
    reset,
    setSelectedBranch,
    clearSelectedBranch,
  };
});
