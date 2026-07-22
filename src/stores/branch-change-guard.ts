export type BranchChangeGuard = (
  nextBranchId: string | null,
) => Promise<boolean>;

let activeGuard: BranchChangeGuard | null = null;

export function registerBranchChangeGuard(
  guard: BranchChangeGuard,
): () => void {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
}

export async function canChangeBranch(
  nextBranchId: string | null,
): Promise<boolean> {
  return activeGuard ? activeGuard(nextBranchId) : true;
}
