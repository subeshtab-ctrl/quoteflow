import { NextResponse } from 'next/server';

const INDEXNOW_KEY = '62804c8be1e74a899bc90f507b94921f';
const HOST = 'blendandbold.com';

const URLS_TO_INDEX = [
  'https://blendandbold.com/',
  'https://blendandbold.com/vs/pandadoc',
  'https://blendandbold.com/vs/zoho-invoice',
  'https://blendandbold.com/vs/freshbooks',
  'https://blendandbold.com/register',
  'https://blendandbold.com/login',
  'https://blendandbold.com/privacy',
  'https://blendandbold.com/terms',
];

export async function GET() {
  try {
    const payload = {
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList: URLS_TO_INDEX,
    };

    const res = await fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return NextResponse.json({
      success: true,
      status: res.status,
      statusText: res.statusText,
      urlsIndexed: URLS_TO_INDEX.length,
      engine: 'IndexNow (Bing / ChatGPT Search)',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit IndexNow' },
      { status: 500 }
    );
  }
}
