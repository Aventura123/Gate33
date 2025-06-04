/**
 * API proxy route for Ocian monitoring server
 * This route forwards requests to the Ocian server to avoid CORS issues
 */
import { NextRequest, NextResponse } from "next/server";

// Ocean monitoring server URL from environment variable
const OCIAN_URL = process.env.OCIAN_URL || 'http://159.65.92.60:3001';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const endpoint = url.pathname.split('/monitoring')[1] || '/status';
    
    // Forward request to Ocian server
    const response = await fetch(`${OCIAN_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MONITORING_API_KEY || process.env.DIGITALOCEAN_TOKEN || ''}`
      },
    });
    
    if (!response.ok) {
      throw new Error(`Ocian server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error proxying request to Ocian server:", error);
    return NextResponse.json(
      { error: error.message || "Error connecting to monitoring server" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const endpoint = url.pathname.split('/monitoring')[1] || '';
    
    // Get request body
    const body = await request.json().catch(() => ({}));
      // Forward request to Ocian server
    const response = await fetch(`${OCIAN_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MONITORING_API_KEY || process.env.DIGITALOCEAN_TOKEN || ''}`
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Ocian server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error proxying request to Ocian server:", error);
    return NextResponse.json(
      { error: error.message || "Error connecting to monitoring server" },
      { status: 500 }
    );
  }
}
