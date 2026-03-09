export interface CreatePresignedUrlPayload {
  fileName: string;
  fileType: string;
}

export interface CreatePresignedUrlResponse {
  data: string;
}

export interface UploadFilePayload {
  file: File;
  url: string;
}
