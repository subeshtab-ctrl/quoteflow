import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Size Validation: Max 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed limit of 10MB' },
        { status: 400 }
      );
    }

    // 2. Extension & MIME Validation: Reject dangerous executable files
    const filename = file.name || 'attachment';
    const ext = path.extname(filename).toLowerCase();
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.jar', '.com', '.scr', '.pif'
    ];
    if (dangerousExtensions.includes(ext)) {
      return NextResponse.json(
        { error: 'Dangerous executable files are strictly prohibited.' },
        { status: 400 }
      );
    }

    // Allowed MIME types
    const allowedMimePrefixes = ['image/', 'application/pdf', 'text/', 'application/zip', 'application/json', 'application/msword', 'application/vnd.'];
    const isAllowedMime = allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix)) || ext === '.pdf' || ext === '.png' || ext === '.jpg' || ext === '.jpeg';
    if (!isAllowedMime) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload documents, PDFs, or images.' },
        { status: 400 }
      );
    }

    // 3. Save file securely
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'support');
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch {}
    }

    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, safeName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    fs.writeFileSync(filePath, buffer);

    const storagePath = `/uploads/support/${safeName}`;

    return NextResponse.json({
      success: true,
      attachment: {
        file_name: filename,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
      },
    });
  } catch (err: any) {
    console.error('Error uploading support attachment:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
