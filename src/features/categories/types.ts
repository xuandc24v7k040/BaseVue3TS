import type {
  CategoryResponseDto,
  CategoryTreeNodeResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "@/api/generated/models";

export type Category = CategoryResponseDto;
export type CategoryTreeNode = CategoryTreeNodeResponseDto;
export type CategoryType = Category["type"];
export type CategoryLevel = Category["level"];
export type CategoryFormMode = "create" | "update";

export interface CategoryFormState {
  name: string;
  description: string;
  parentId: string | null;
  type: CategoryType;
  isActive: boolean;
  sortOrder: number;
}

export type CategoryCreatePayload = CreateCategoryDto;
export type CategoryUpdatePayload = UpdateCategoryDto;
