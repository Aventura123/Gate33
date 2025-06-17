const axios = require('axios');

async function checkOrganizations(accessToken) {
  console.log('🔍 Checking LinkedIn Organizations...');
  
  try {
    // Get organizations
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
    
    console.log(`Found ${adminOrgs.length} organization(s) with admin rights:`);
    
    // Get details for each organization
    for (let i = 0; i < adminOrgs.length; i++) {
      const org = adminOrgs[i];
      const orgId = org.organization.replace('urn:li:organization:', '');
      
      try {
        // Get organization details
        const orgDetailsResponse = await axios.get(`https://api.linkedin.com/v2/organizations/${orgId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });
        
        const orgName = orgDetailsResponse.data.localizedName || orgDetailsResponse.data.name;
        console.log(`  ${i + 1}. Organization ID: ${orgId}`);
        console.log(`     Name: ${orgName}`);
        console.log(`     Role: ${org.role}`);
        console.log('');
        
      } catch (detailError) {
        console.log(`  ${i + 1}. Organization ID: ${orgId}`);
        console.log(`     Role: ${org.role}`);
        console.log(`     Error getting details: ${detailError.message}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking organizations');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Usage
const token = process.argv[2];
if (!token) {
  console.log('Usage: node check-organizations.js <access_token>');
  process.exit(1);
}

checkOrganizations(token);
