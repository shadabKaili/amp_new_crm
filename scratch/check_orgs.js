const https = require('https');

const token = 'sbp_faf8b2f91781bb83eadb7453531523168b4bea05';

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/organizations`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  res.on('end', () => {
    if (res.statusCode === 200) {
        const orgs = JSON.parse(responseData);
        console.log('Organizations:', JSON.stringify(orgs, null, 2));
    } else {
        console.log('Error Status code:', res.statusCode);
        console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
