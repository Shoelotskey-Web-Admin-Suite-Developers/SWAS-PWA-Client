// Frontend-only image processing utilities: resize, convert to JPG, and validate

export type ProcessOptions = {
  width: number;
  height: number;
  mime?: 'image/jpeg';
  quality?: number; // 0..1
  maxBytes?: number; // e.g., 300 * 1024 * 1024
  fileName?: string; // resulting file name
};

async function fileToImageSrc(fileOrBlobOrDataUrl: File | Blob | string): Promise<string> {
  if (typeof fileOrBlobOrDataUrl === 'string') {
    return fileOrBlobOrDataUrl; // assume data URL or URL
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(fileOrBlobOrDataUrl);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, type, quality);
  });
}

// Draw the image to fully cover the target canvas and center-crop
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetW: number,
  targetH: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(targetW / iw, targetH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (targetW - dw) / 2;
  const dy = (targetH - dh) / 2;
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, dx, dy, dw, dh);
}

export async function processImageToJpg(
  input: File | Blob | string,
  opts: ProcessOptions
): Promise<File> {
  const { width, height, mime = 'image/jpeg', quality = 0.9, maxBytes, fileName } = opts;

  const src = await fileToImageSrc(input);
  const img = await loadImage(src);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  drawCover(ctx, img, width, height);

  const blob = await canvasToBlob(canvas, mime, quality);

  if (maxBytes && blob.size > maxBytes) {
    throw new Error(`Processed image exceeds maximum size: ${blob.size} bytes > ${maxBytes} bytes`);
  }

  // Try to infer a safe name
  let name = fileName || 'image.jpg';
  if (!fileName && typeof input !== 'string') {
    const original = (input as File).name || 'image';
    const base = original.replace(/\.[^.]+$/, '');
    name = `${base}.jpg`;
  }

  return new File([blob], name, { type: mime, lastModified: Date.now() });
}

export async function validateImageFile(
  file: File,
  expectedW: number,
  expectedH: number,
  mime: string,
  maxBytes: number
): Promise<{ valid: boolean; reasons: string[]; meta: { width: number; height: number; type: string; sizeBytes: number } }> {
  const reasons: string[] = [];

  if (file.type !== mime) reasons.push(`Invalid MIME type: ${file.type} (expected ${mime})`);
  if (file.size > maxBytes) reasons.push(`File too large: ${(file.size / (1024 * 1024)).toFixed(2)} MB (max ${(maxBytes / (1024 * 1024)).toFixed(0)} MB)`);

  let width = 0, height = 0;
  try {
    const src = await fileToImageSrc(file);
    const img = await loadImage(src);
    width = img.naturalWidth || img.width;
    height = img.naturalHeight || img.height;
    if (width !== expectedW || height !== expectedH) {
      reasons.push(`Invalid dimensions: ${width}x${height} (expected ${expectedW}x${expectedH})`);
    }
  } catch (e) {
    reasons.push('Unable to read image for validation');
  }

  return {
    valid: reasons.length === 0,
    reasons,
    meta: { width, height, type: file.type, sizeBytes: file.size },
  };
}
