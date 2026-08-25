import { NextResponse } from 'next/server';
import { fetchN8n } from '@/lib/api';

export async function GET() {
  try {
    const data = await fetchN8n('gleanearth-dashboard-data');
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
