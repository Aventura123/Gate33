const axios = require('axios');

// Function to test LinkedIn token
async function testLinkedInToken(accessToken) {
  console.log('🔍 Testing LinkedIn Access Token for Organization Posting...');
  console.log(`Token length: ${accessToken.length}`);
  
  try {
    // Test 1: Basic profile
    console.log('\n📋 Test 1: Basic Profile');
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    console.log('✅ Profile test passed');
    console.log('Profile ID:', profileResponse.data.id);
    
    // Test 2: Organization Admin Access
    console.log('\n🏢 Test 2: Organization Admin Access');
    const orgResponse = await axios.get('https://api.linkedin.com/v2/organizationAcls?q=roleAssignee', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    const organizations = orgResponse.data.elements || [];
    const adminOrgs = organizations.filter(org => 
      org.role === 'ADMINISTRATOR' || org.role === 'MANAGER'
    );
    
    console.log('✅ Organization access test passed');
    console.log(`Found ${adminOrgs.length} organization(s) with admin rights:`);
    adminOrgs.forEach((org, index) => {
      const orgId = org.organization.replace('urn:li:organization:', '');
      console.log(`  ${index + 1}. Organization ID: ${orgId}, Role: ${org.role}`);
    });
    
    // Test 3: UGC Posts capability for organization (if we have an org)
    if (adminOrgs.length > 0) {
      console.log('\n📝 Test 3: Organization UGC Posts');
      const orgId = adminOrgs[0].organization.replace('urn:li:organization:', '');
      const testPayload = {
        author: `urn:li:organization:${orgId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: '🧪 Testing LinkedIn API integration for Gate33 job posting system - Organization Post'
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
      
      const postResponse = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        testPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Organization UGC Posts test passed');
      console.log('Post ID:', postResponse.data.id);
      console.log('Status:', postResponse.status);
    } else {      console.log('\n⚠️  Test 3: No organizations found with admin rights - testing personal posting');
      
      const testPayload = {
        author: 'urn:li:person:me',
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: '🧪 Testing LinkedIn API integration for Gate33 job posting system - Personal Post'
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };
      
      const postResponse = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        testPayload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Personal UGC Posts test passed');
      console.log('Post ID:', postResponse.data.id);
      console.log('Status:', postResponse.status);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ LinkedIn API test failed');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

// Function to exchange authorization code for access token
async function getAccessToken(authCode) {
  console.log('🔄 Exchanging authorization code for access token...');
  
  try {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: 'http://localhost:3000/api/linkedin/callback',
        client_id: '78qnrs9v6gftpj',
        client_secret: 'WZJlCLGLSZJZsOhH'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ Access token obtained successfully');
    console.log('Token:', response.data.access_token);
    console.log('Expires in:', response.data.expires_in, 'seconds');
    
    return response.data.access_token;
    
  } catch (error) {
    console.error('❌ Failed to get access token');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node test-linkedin-token.js <access_token>');
    console.log('  node test-linkedin-token.js --auth-code <authorization_code>');
    return;
  }
  
  if (args[0] === '--auth-code' && args[1]) {
    // Get access token from auth code
    const accessToken = await getAccessToken(args[1]);
    if (accessToken) {
      await testLinkedInToken(accessToken);
    }
  } else {
    // Test existing access token
    await testLinkedInToken(args[0]);
  }
}

main().catch(console.error);
