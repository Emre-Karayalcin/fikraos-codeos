export interface Specialty {
  id: string;
  name_fr: string;
  name_en: string;
  order: number;
}

export interface GetSpecialtiesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetSpecialtiesResponse {
  rows: Specialty[];
  count: number | null;
}

export interface CreateSpecialtyPayload {
  name_fr: string;
  name_en: string;
  order?: number;
}

export interface UpdateSpecialtyPayload extends Partial<CreateSpecialtyPayload> {
  id: string;
}
