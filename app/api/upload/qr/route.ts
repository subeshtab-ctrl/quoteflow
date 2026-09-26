import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const supabase = createAdminClient();

    const contentType = req.headers.get('content-type') || '';
    let qrUrl = '';

    if (contentType.includes('application/json')) {
      const json = await req.json();
      if (!json.dataUrl && !json.qrUrl) {
        return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
      }
      qrUrl = json.dataUrl || json.qrUrl;
    } else {
      const formData = await req.formData();
      const file = (formData.get('qr') || formData.get('file') || formData.get('image')) as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No QR code image file uploaded' }, { status: 400 });
      }

      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'QR code image must be under 5MB' }, { status: 400 });
      }

      // Allowed types
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file format. Please upload PNG, JPG, WebP, or SVG.' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const storageFileName = `${orgId}/qr-${Date.now()}.${ext}`;

      // 1. Supabase Storage (production)
      if (supabase) {
        try {
          const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(storageFileName, buffer, {
              contentType: file.type || 'image/png',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicData } = supabase.storage
              .from('logos')
              .getPublicUrl(storageFileName);
            if (publicData?.publicUrl) {
              qrUrl = publicData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Supabase storage QR upload exception:', storageErr);
        }
      }

      // 2. Local filesystem fallback
      if (!qrUrl) {
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const localFileName = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const filePath = path.join(uploadsDir, localFileName);
          fs.writeFileSync(filePath, buffer);
          qrUrl = `/uploads/${localFileName}`;
        } catch (fsErr) {
          const mime = file.type || 'image/png';
          qrUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      qr_url: qrUrl,
      message: 'QR code image successfully uploaded.',
    });
  } catch (err: any) {
    console.error('QR code upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload QR code' },
      { status: 500 }
    );
  }
}
