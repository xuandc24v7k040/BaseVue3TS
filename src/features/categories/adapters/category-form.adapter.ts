import type { Category, CategoryFormState } from "../types";

export function emptyCategoryForm(): CategoryFormState {
  return {
    name: "",
    description: "",
    parentId: null,
    type: "NORMAL",
    isActive: true,
    sortOrder: 0,
  };
}

export function categoryToForm(category: Category): CategoryFormState {
  return {
    name: category.name,
    description: category.description ?? "",
    parentId: category.parentId,
    type: category.type,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

export function toCategoryPayload(form: CategoryFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    parentId: form.parentId,
    type: form.type,
    isActive: form.isActive,
    sortOrder: form.sortOrder,
  };
}
