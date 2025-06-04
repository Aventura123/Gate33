/**
 * API proxy route for Ocian wallet balance endpoint
 */
import { NextRequest, NextResponse } from "next/server";

// Ocian server URL
const OCIAN_URL = process.env.OCIAN_URL || 'http://159.65.92.60:3001';

export async function GET() {
  try {    // Forward request to Ocian server wallet-balance endpoint
    const response = await fetch(`${OCIAN_URL}/wallet-balance`, {
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
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching wallet balance" },
      { status: 500 }
    );
  }
}
