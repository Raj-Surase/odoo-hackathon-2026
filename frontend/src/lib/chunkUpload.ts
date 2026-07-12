import { api } from './api';

export interface ChunkUploadResult {
  temp_path: string;
  filename: string;
  size: number;
  mime_type: string;
}

export interface ChunkUploadOptions {
  onProgress?: (progress: number) => void;
  chunkSize?: number; // bytes, defaults to 2MB
  signal?: AbortSignal;
}

/**
 * Uploads a file in chunks to the backend staging area.
 */
export async function uploadFileInChunks(
  file: File,
  options?: ChunkUploadOptions
): Promise<ChunkUploadResult> {
  const chunkSize = options?.chunkSize ?? 2 * 1024 * 1024; // 2MB chunk size
  const totalChunks = Math.ceil(file.size / chunkSize);
  const fileUuid = crypto.randomUUID ? crypto.randomUUID() : generateSimpleUuid();
  const filename = file.name;

  const onProgress = options?.onProgress;
  const signal = options?.signal;

  // If the file is 0 bytes, we still send one empty chunk
  const actualTotalChunks = totalChunks === 0 ? 1 : totalChunks;

  for (let index = 0; index < actualTotalChunks; index++) {
    if (signal?.aborted) {
      throw new DOMException('Upload aborted', 'AbortError');
    }

    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const fileChunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file_uuid', fileUuid);
    formData.append('chunk_index', index.toString());
    formData.append('total_chunks', actualTotalChunks.toString());
    formData.append('filename', filename);
    formData.append('file', fileChunk, filename);

    const response = await api.post('/chunks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || `Failed to upload chunk ${index + 1}/${actualTotalChunks}`);
    }

    if (onProgress) {
      if (response.data.status === 'completed') {
        onProgress(100);
        return response.data as ChunkUploadResult;
      } else {
        const progress = Math.round(((index + 1) / actualTotalChunks) * 100);
        onProgress(Math.min(progress, 99)); // Cap at 99% until backend merges
      }
    } else if (response.data.status === 'completed') {
      return response.data as ChunkUploadResult;
    }
  }

  throw new Error('Upload finished but did not receive complete status from server.');
}

/**
 * Generates a simple UUID in case crypto.randomUUID is not available.
 */
function generateSimpleUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
