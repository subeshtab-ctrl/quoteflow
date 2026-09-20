import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { createAdminClient } from '@/lib/supabase/service-role';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
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
      const fileName = `logo-${Date.now()}.${ext}`;

      // Save to public/uploads directory
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      logoUrl = `/uploads/${fileName}`;
    }

    // Update in-memory store
    await store.updateOrganization('a0000000-0000-0000-0000-000000000001', {
      logo_url: logoUrl,
    });

    // Also update Supabase database if connected
    const supabase = createAdminClient();
    if (supabase) {
      await supabase
        .from('organizations')
        .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
        .eq('id', 'a0000000-0000-0000-0000-000000000001');
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
    // Reset logo to empty string
    await store.updateOrganization('a0000000-0000-0000-0000-000000000001', {
      logo_url: '',
    });

    const supabase = createAdminClient();
    if (supabase) {
      await supabase
        .from('organizations')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', 'a0000000-0000-0000-0000-000000000001');
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
