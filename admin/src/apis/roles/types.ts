export interface Role {
  id: string;
  name_fr: string;
  name_en: string;
  order: number;
  color?: string; // hex color
}

export interface GetRolesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetRolesResponse {
  rows: Role[];
  count: number | null;
}

export interface CreateRolePayload {
  name_fr: string;
  name_en: string;
  order?: number;
  color?: string;
}

export interface UpdateRolePayload extends Partial<CreateRolePayload> {
  id: string;
}
