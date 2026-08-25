import { NextResponse } from 'next/server';
import { fetchN8n } from '@/lib/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const data = await fetchN8n(`gleanearth-dashboard-messages?phone=${encodeURIComponent(phone)}`);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
