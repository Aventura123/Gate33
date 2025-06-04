/**
 * API proxy route for Ocian monitoring server restart endpoint
 */
import { NextRequest, NextResponse } from "next/server";

// Ocian server URL
const OCIAN_URL = process.env.OCIAN_URL || 'http://159.65.92.60:3001';

export async function POST(request: NextRequest) {
  try {    // Forward request to Ocian server restart endpoint
    const response = await fetch(`${OCIAN_URL}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MONITORING_API_KEY || process.env.DIGITALOCEAN_TOKEN || ''}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Ocian server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error restarting monitoring:", error);
    return NextResponse.json(
      { error: error.message || "Error restarting monitoring" },
      { status: 500 }
    );
  }
}
