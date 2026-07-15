export const BRANCH_HEADER_NAME = 'X-Branch-Id'

export class BranchScopeRequiredError extends Error {
  readonly code = 'BRANCH_SCOPE_REQUIRED'

  constructor() {
    super('A selected branch is required for this request.')
    this.name = 'BranchScopeRequiredError'
  }
}
