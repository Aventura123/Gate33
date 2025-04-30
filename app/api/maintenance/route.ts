import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'This API endpoint is temporarily unavailable for maintenance',
    status: 503
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({
    message: 'This API endpoint is temporarily unavailable for maintenance',
    status: 503
  }, { status: 503 });
}
