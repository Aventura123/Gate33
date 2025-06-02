import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getHttpRpcUrls } from '@/config/rpcConfig';

// Simple ERC20 interface for basic validation
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)"
];

// ERC20 is the only contract type we need to validate

export async function POST(request: NextRequest) {
  try {
    const { contractAddress, network = 'sepolia' } = await request.json();
    
    // Validate contract address format
    if (!ethers.utils.isAddress(contractAddress)) {
      return NextResponse.json({ 
        valid: false, 
        error: "Invalid Ethereum address format"
      }, { status: 400 });
    }
    
    // Get RPC URL directly from config
    const providerUrls = getHttpRpcUrls(network);
    
    if (!providerUrls || providerUrls.length === 0) {
      return NextResponse.json({ 
        valid: false, 
        error: `No RPC URLs available for network: ${network}`
      }, { status: 400 });
    }
    
    // Create provider with the URL from config
    const provider = new ethers.providers.JsonRpcProvider(providerUrls[0]);
    
    // Check if address has code (is a contract)
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      return NextResponse.json({ 
        valid: false, 
        error: "The address is not a contract"
      }, { status: 400 });
    }
    
    // Try to validate as ERC20 token
    try {
      const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
      const tokenName = await erc20Contract.name();
      const tokenSymbol = await erc20Contract.symbol();
      const tokenDecimals = await erc20Contract.decimals();
      
      return NextResponse.json({
        valid: true,
        isERC20: true,
        contractDetails: {
          name: tokenName,
          symbol: tokenSymbol,
          decimals: Number(tokenDecimals)
        }
      });
    } catch (erc20Error) {
      console.log("Not an ERC20 token, checking for airdrop functions...");
    }
    
    // Contract might still be valid but doesn't conform to our interfaces
    return NextResponse.json({
      valid: true,
      genericContract: true,
      message: "Contract exists but doesn't match ERC20 pattern"
    });
  } catch (error: any) {
    console.error("Contract verification error:", error);
    return NextResponse.json({
      valid: false,
      error: error.message || "Failed to verify contract"
    }, { status: 500 });
  }
}
