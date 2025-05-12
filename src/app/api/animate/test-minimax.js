// test-minimax-api.js
const fs = require('fs');
const path = require('path');
const https = require('https');

// API key is pre-configured, but can be overridden with command line argument
const DEFAULT_API_KEY = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJHcm91cE5hbWUiOiJzcmkgc2FpIHNha2V0aCBjaGlsbGFwYWxsaSIsIlVzZXJOYW1lIjoic3JpIHNhaSBzYWtldGggY2hpbGxhcGFsbGkiLCJBY2NvdW50IjoiIiwiU3ViamVjdElEIjoiMTkyMTc4MDk2NzE0NDQyNzkzMiIsIlBob25lIjoiIiwiR3JvdXBJRCI6IjE5MjE3ODA5NjcxNDAyMzM2MjgiLCJQYWdlTmFtZSI6IiIsIk1haWwiOiJzcmlzYWlzYWtldGhjb2RlQGdtYWlsLmNvbSIsIkNyZWF0ZVRpbWUiOiIyMDI1LTA1LTEyIDE1OjAyOjE3IiwiVG9rZW5UeXBlIjoxLCJpc3MiOiJtaW5pbWF4In0.dnjGZhhfC7IOnaiMsg4HwwpVL3VPrypk6RbIfSpIycqBPqeEt3X9ZuoLJkpeRgJ7IZ9DM2kV2p34qUSl2zhGBhTMkkFPVBbrE1UjCz0esm_GPFOz1YDQGCw3PTfKvXn4fCL0RaFrFzm-MSd_Rt25WzyIFSjBLlyo1mlkLVx_1nnsuzI1N3YC21TkXAj94XTmc3w3u_dAO_z13544BbXhqQyk3ZerkVNEg91uz47b944eU87nCUplFL5tNMuWPU2aYYaLzuO1u6nEryAmlp-dUFY_dbD9guKZ-nSSLJ72eoN1wSN8k6BXoiD796hk6A1liSKGI_uhN6XBsF7TjbvzDg";

// Get command line arguments
const apiKey = process.argv[2] || DEFAULT_API_KEY;
const imagePath = process.argv[2] && !process.argv[2].includes('eyJhbG') ? process.argv[2] : process.argv[3];
const prompt = imagePath ? (process.argv[4] || '[Pan right]A detailed scene') : '[Pan right]A detailed scene';

if (!imagePath) {
  console.error('Usage: node test-minimax-api.js [API_KEY] <IMAGE_PATH> [PROMPT]');
  console.error('Example: node test-minimax-api.js ./test-image.jpg "[Pan right]A beautiful landscape"');
  console.error('Note: The API key is already included in the script, but you can override it.');
  process.exit(1);
}

// Read and convert image to base64
try {
  const imageFile = fs.readFileSync(path.resolve(imagePath));
  const extension = path.extname(imagePath).substring(1) || 'jpeg';
  const base64Image = `data:image/${extension};base64,${imageFile.toString('base64')}`;
  
  // Prepare the request data
  const data = JSON.stringify({
    model: 'I2V-01-Director',
    prompt: prompt,
    first_frame_image: base64Image
  });
  
  // Try multiple authorization formats
  const tryAuthFormats = [
    // 1. Try secret key format directly
    apiKey,
    // 2. Try Bearer format
    `Bearer ${apiKey}`,
    // 3. Try Key format
    `Key ${apiKey}`,
    // 4. Try removing 'Bearer ' if it's already in the key
    apiKey.replace('Bearer ', '')
  ];
  
  // Use the first format as default
  let currentAuthFormat = 0;
  tryRequest();
  
  function tryRequest() {
    // Prepare the request options
    const options = {
      hostname: 'api.minimax.chat',
      path: '/v1/video_generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': tryAuthFormats[currentAuthFormat],
        'Content-Length': data.length
      }
    };
    
    console.log(`\nTesting Minimax API with image: ${imagePath}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Using authorization format ${currentAuthFormat+1}/${tryAuthFormats.length}: ${tryAuthFormats[currentAuthFormat].substring(0, 20)}...`);
    console.log('Sending request...');
    
    // Make the request
    const req = https.request(options, (res) => {
      console.log(`\nStatus Code: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}\n`);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('Response:');
          console.log(JSON.stringify(parsedData, null, 2));
          
          if (parsedData.video_url) {
            console.log(`\nSuccess! Video URL: ${parsedData.video_url}`);
          } else if (parsedData.base_resp && parsedData.base_resp.status_code === 1004 && currentAuthFormat < tryAuthFormats.length - 1) {
            // If authentication failed and we have more formats to try
            console.log(`\nAuthentication failed with format ${currentAuthFormat+1}. Trying next format...\n`);
            currentAuthFormat++;
            tryRequest();
          } else if (parsedData.base_resp && parsedData.base_resp.status_code === 1004) {
            console.log('\nAll authentication formats failed. You may need to:');
            console.log('1. Check if you have an API secret key (not a JWT token)');
            console.log('2. Check https://www.minimax.io/platform/document/video_generation for latest authentication requirements');
            console.log('3. Generate a new API key if yours has expired');
          }
        } catch (e) {
          console.log('Raw response: ', responseData);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error: ${error.message}`);
    });
    
    // Send the request
    req.write(data);
    req.end();
    
    console.log('Request sent, waiting for response...');
  }
  
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}