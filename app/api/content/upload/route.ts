import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireAuthUser } from '@/lib/server/auth-guard';
import { ok, badRequest, unauthorized, serverError } from '@/lib/server/api-response';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}.${safeExt}`;
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return badRequest('No file provided');
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return badRequest('Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    if (file.size > MAX_SIZE) {
      return badRequest('File size must be under 5MB');
    }

    const filename = generateFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(join(UPLOAD_DIR, filename), buffer);

    return ok({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Upload error:', error);
    return serverError('Failed to upload file');
  }
}
