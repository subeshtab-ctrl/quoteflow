import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
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
    let logoUrl = '';

    if (contentType.includes('application/json')) {
      const json = await req.json();
      if (!json.dataUrl && !json.logoUrl) {
        return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
      }
      logoUrl = json.dataUrl || json.logoUrl;
    } else {
      const formData = await req.formData();
      const file = (formData.get('logo') || formData.get('file')) as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image size must be less than 5MB' }, { status: 400 });
      }

      // Validate MIME type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file format. Please upload PNG, JPG, WebP, or SVG.' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const storageFileName = `${orgId}/logo-${Date.now()}.${ext}`;

      // 1. Primary: Upload to Supabase Storage (works seamlessly on Vercel & Production)
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
              logoUrl = publicData.publicUrl;
            }
          } else {
            console.warn('Supabase storage upload error:', uploadError);
          }
        } catch (storageErr) {
          console.warn('Supabase storage upload exception:', storageErr);
        }
      }

      // 2. Fallback: Local filesystem (for local dev) OR Base64 data URL
      if (!logoUrl) {
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const localFileName = `logo-${Date.now()}.${ext}`;
          const filePath = path.join(uploadsDir, localFileName);
          fs.writeFileSync(filePath, buffer);
          logoUrl = `/uploads/${localFileName}`;
        } catch (fsErr) {
          // In read-only serverless environments like Vercel without local write permission:
          const mime = file.type || 'image/png';
          logoUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        }
      }
    }

    // Update in-memory store
    await store.updateOrganization(orgId, {
      logo_url: logoUrl,
    });

    // Also update Supabase database directly
    if (supabase) {
      await supabase
        .from('organizations')
        .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
        .eq('id', orgId);
    }

    return NextResponse.json({
      success: true,
      logo_url: logoUrl,
      message: 'Logo successfully uploaded and saved.',
    });
  } catch (err: any) {
    console.error('Logo upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    // Reset logo in store
    await store.updateOrganization(orgId, {
      logo_url: '',
    });

    // Reset logo in Supabase database
    const supabase = createAdminClient();
    if (supabase) {
      await supabase
        .from('organizations')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', orgId);
    }

    return NextResponse.json({
      success: true,
      logo_url: '',
      message: 'Logo successfully removed.',
    });
  } catch (err: any) {
    console.error('Logo delete error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to remove logo' },
      { status: 500 }
    );
  }
}
