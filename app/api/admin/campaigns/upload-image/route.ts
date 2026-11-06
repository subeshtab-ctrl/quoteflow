import { NextRequest, NextResponse } from 'next/server';
import { getAdminActorContext } from '@/lib/billing/dev-admin-auth';
import { createAdminClient } from '@/lib/supabase/service-role';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Unauthorized developer admin' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    let imageUrl = '';

    if (contentType.includes('application/json')) {
      const json = await req.json();
      if (!json.imageUrl && !json.dataUrl) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 });
      }
      imageUrl = json.imageUrl || json.dataUrl;
    } else {
      const formData = await req.formData();
      const file = (formData.get('image') || formData.get('file')) as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
      }

      // Max 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image size must be less than 5MB' }, { status: 400 });
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file format. Please upload PNG, JPG, WebP, or GIF.' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const supabase = createAdminClient();
      if (supabase) {
        try {
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(`campaigns/${fileName}`, buffer, {
              contentType: file.type || 'image/png',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicData } = supabase.storage
              .from('attachments')
              .getPublicUrl(`campaigns/${fileName}`);
            if (publicData?.publicUrl) {
              imageUrl = publicData.publicUrl;
            }
          }
        } catch (supabaseErr) {
          console.warn('Supabase storage upload exception:', supabaseErr);
        }
      }

      // Local fallback if Supabase storage was not used or failed
      if (!imageUrl) {
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'campaigns');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const filePath = path.join(uploadsDir, fileName);
          fs.writeFileSync(filePath, buffer);
          imageUrl = `/uploads/campaigns/${fileName}`;
        } catch (localErr) {
          // Fallback to data URL
          const base64 = buffer.toString('base64');
          imageUrl = `data:${file.type};base64,${base64}`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Image upload failed' }, { status: 500 });
  }
}
