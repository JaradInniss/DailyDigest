import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('timezone')
    .single();

  if (error || !data) {
    // Return default timezone if settings not found
    return NextResponse.json({ timezone: 'Atlantic/Halifax' });
  }

  return NextResponse.json({ timezone: data.timezone });
}
