import { NextRequest, NextResponse } from 'next/server';
import { handleAuth } from '@kinde-oss/kinde-auth-nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: any) {
  if (!process.env.KINDE_ISSUER_URL) {
    return NextResponse.json(
      { error: 'Kinde OAuth provider is not configured in this environment.' },
      { status: 503 }
    );
  }
  const handler = handleAuth();
  return handler(req, ctx);
}
