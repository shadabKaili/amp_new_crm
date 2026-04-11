const https = require('https');

const projectRef = 'pdbgzhiftxygnupkhvxb';
const token = 'sbp_faf8b2f91781bb83eadb7453531523168b4bea05';

const options = {
  hostname: 'api.supabase.com',
  port: 443,
  path: `/v1/projects/${projectRef}`,
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
    console.log('Status code:', res.statusCode);
    if (res.statusCode === 200) {
        const project = JSON.parse(responseData);
        console.log('Project Details:', JSON.stringify(project, null, 2));
    } else {
        console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
