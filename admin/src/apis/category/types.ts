export interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  order: number;
  description_fr?: string;
  description_en?: string;
}

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetCategoriesResponse {
  rows: Category[];
  count: number | null;
}

export interface CreateCategoryPayload {
  name_fr: string;
  name_en: string;
  order?: number;
  description_fr?: string;
  description_en?: string;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {
  id: string;
}
