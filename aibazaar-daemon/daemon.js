const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PORT = 7777;
const ALLOWED_ORIGIN = 'http://localhost:3000'; 
const UV_BIN = process.platform === 'win32' ? path.join(__dirname, 'uv.exe') : path.join(__dirname, 'uv');
const TRACKING_FILE = path.join(__dirname, 'running_apps.json');

// --- 1. STARTUP HEALTH CHECK ---
function runStartupCheck() {
  console.log(`[System] Verifying 'uv' binary health...`);
  if (!fs.existsSync(UV_BIN)) {
    console.error(`[FATAL ERROR] The 'uv' executable was not found in this directory!`);
    process.exit(1); 
  }

  exec(`"${UV_BIN}" --version`, (err, stdout) => {
    if (err) {
      console.error(`[FATAL ERROR] 'uv' binary is present but failed to execute.`);
      process.exit(1);
    }
    console.log(`[System] UV Engine ready: ${stdout.trim()}`);
  });
}

// --- 2. SECURITY CHECK ---
function isAuthorizedRepo(url) {
  const ALLOWED_PREFIXES = [
    'https://github.com/baroi-ai/ai-bazaar-scripts/',
    'https://raw.githubusercontent.com/baroi-ai/ai-bazaar-scripts/'
  ];
  return ALLOWED_PREFIXES.some(prefix => url.startsWith(prefix));
}

function convertToRawUrl(githubUrl) {
  if (githubUrl.includes('github.com') && !githubUrl.includes('raw.githubusercontent.com')) {
    return githubUrl
      .replace('github.com', 'raw.githubusercontent.com')
      .replace('/blob/', '/');
  }
  return githubUrl;
}

// --- 3. PORT SCANNER ---
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(e);
      }
    });
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

// --- 4. STATE MANAGER ---
function updateAppTracker(appId, data) {
  let apps = {};
  if (fs.existsSync(TRACKING_FILE)) {
    apps = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  }
  if (data === null) {
    delete apps[appId]; 
  } else {
    apps[appId] = data; 
  }
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(apps, null, 2));
}

function getAppStatus(appId) {
  if (!fs.existsSync(TRACKING_FILE)) return null;
  const apps = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  const appData = apps[appId];
  if (!appData) return null;

  try {
    process.kill(appData.pid, 0); 
    return appData; 
  } catch (e) {
    updateAppTracker(appId, null); 
    return null; 
  }
}

// --- 5. THE SERVER ---
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // ENDPOINT: Check App Status
  if (req.method === 'GET' && req.url.startsWith('/v1/status')) {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const appId = urlParams.get('app');
    const status = getAppStatus(appId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ isRunning: !!status, data: status }));
    return;
  }

  // ENDPOINT: Stop App
  if (req.method === 'POST' && req.url === '/v1/stop') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { app } = JSON.parse(body);
      const appData = getAppStatus(app);
      
      if (appData) {
        try {
          process.kill(appData.pid, process.platform === 'win32' ? 'SIGKILL' : 'SIGTERM');
        } catch (e) { /* Ignore if already dead */ }
        updateAppTracker(app, null);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: "stopped", app }));
    });
    return;
  }

  // ENDPOINT: Run App
  if (req.method === 'POST' && req.url === '/v1/run-script') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { scriptUrl, model } = JSON.parse(body);
        
        if (!isAuthorizedRepo(scriptUrl)) {
          console.error(`[SECURITY WARNING] Blocked execution attempt from unauthorized URL: ${scriptUrl}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Security Violation: Scripts can only be executed from the official baroi-ai repository.' }));
          return;
        }

        const existingApp = getAppStatus(model);
        if (existingApp) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: "success", port: existingApp.port, message: "Already running" }));
          return;
        }

        const dynamicPort = await findAvailablePort(8899);
        console.log(`[System] Reserved dynamic port ${dynamicPort} for ${model}`);

        const rawDownloadUrl = convertToRawUrl(scriptUrl);
        const filename = path.basename(rawDownloadUrl);
        const scriptsDir = path.join(__dirname, 'downloaded_scripts');
        const localScriptPath = path.join(scriptsDir, filename);

        if (!fs.existsSync(scriptsDir)) { fs.mkdirSync(scriptsDir, { recursive: true }); }

        // --- THE OFFLINE FALLBACK ENGINE ---
        // We isolate the actual "run" command so we can call it whether online or offline
        const executeApp = () => {
          const runCommand = `"${UV_BIN}" run --python 3.11 "${localScriptPath}" "${model}" "" "${dynamicPort}"`;
          
          exec(runCommand, (execErr, stdout) => {
            try {
              const parsedOutput = JSON.parse(stdout.trim());
              if (parsedOutput.pid) {
                updateAppTracker(model, { pid: parsedOutput.pid, port: parsedOutput.port });
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(parsedOutput));
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: "Failed to parse Python engine output." }));
            }
          });
        };

        // Notice the `--fail` flag added to curl. It forces curl to throw an error if internet drops
        exec(`curl -s -L --fail "${rawDownloadUrl}" -o "${localScriptPath}"`, (curlErr) => {
          if (curlErr) {
            console.warn(`[Network] Internet unavailable or sync failed for ${model}. Checking local cache...`);
            
            // Check if we have a downloaded version from a previous online session
            if (fs.existsSync(localScriptPath)) {
              console.log(`[Offline Mode] Cached script found! Booting ${model} locally.`);
              executeApp();
            } else {
              // True hard failure: No internet AND no local cache
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'You are offline and this application has not been installed yet.' }));
            }
          } else {
            // Success! We synced the latest script from GitHub. Run it.
            executeApp();
          }
        });

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload structure received.' }));
      }
    });
  }
});

// Boot sequence
runStartupCheck();

server.listen(PORT, 'localhost', () => {
  console.log(`================================================================`);
  console.log(`🔮 AI Bazaar Dynamic Engine Layer Online on Port ${PORT}`);
  console.log(`================================================================`);
});