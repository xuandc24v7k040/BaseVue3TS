import type {
  CategoriesTreeParams,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "@/api/generated/models";
import {
  categoriesCreate,
  categoriesDelete,
  categoriesGet,
  categoriesRemoveImage,
  categoriesTree,
  categoriesUpdate,
  categoriesUploadImage,
} from "@/api/generated/endpoints/categories/categories";

export function listCategoryTree(
  params: CategoriesTreeParams,
  signal?: AbortSignal,
) {
  return categoriesTree(params, undefined, signal);
}

export function getCategory(id: string, signal?: AbortSignal) {
  return categoriesGet(id, undefined, signal);
}

export function createCategory(payload: CreateCategoryDto) {
  return categoriesCreate(payload);
}

export function updateCategory(id: string, payload: UpdateCategoryDto) {
  return categoriesUpdate(id, payload);
}

export function uploadCategoryImage(id: string, file: Blob) {
  return categoriesUploadImage(id, { file });
}

export function removeCategoryImage(id: string) {
  return categoriesRemoveImage(id);
}

export function deleteCategory(id: string) {
  return categoriesDelete(id);
}
