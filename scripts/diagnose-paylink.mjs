
import fetch from 'node-fetch';

const TEST_URL = 'https://restpilot.paylink.sa/api/auth';
const PROD_URL = 'https://restapi.paylink.sa/api/auth';

const CREDENTIALS = {
    apiId: "APP_ID_1123453311",
    secretKey: "0662abb5-13c7-38ab-cd12-236e58f43766",
    persistToken: false
};

async function testConnection(name, url, expectSuccess) {
    console.log(`\n--- Testing ${name} (${url}) ---`);
    try {
        const start = Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Node/TestScript'
            },
            body: JSON.stringify(CREDENTIALS),
            timeout: 10000 // 10s timeout
        });
        const duration = Date.now() - start;

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Duration: ${duration}ms`);

        const text = await response.text();
        console.log(`Response Body Preview: ${text.substring(0, 200)}...`);

        if (response.ok) {
            console.log("✅ Connection Successful!");
        } else {
            console.log(`⚠️ Server returned error (Expected for Prod with test keys: 401).`);
        }
    } catch (error) {
        console.error(`❌ Network Error:`, error.message);
    }
}

async function run() {
    console.log("Starting Paylink Connectivity Diagnosis...");

    // 1. Test the Troubled URL (Test Env)
    await testConnection("TEST ENV (restpilot)", TEST_URL, true);

    // 2. Test the Production URL (Just for connectivity check)
    // We expect 401 (Unauthorized) because we are using test keys, 
    // BUT if we get 504 or Timeout, it means the NETWORK is blocked.
    await testConnection("PROD ENV (restapi)", PROD_URL, false);
}

run();
