const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('renderer/index.html');
}

const configPath = path.join(app.getPath('userData'), 'config.json');

ipcMain.handle('get-config', () => {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return { bots: [], apiType: 'gateway', baseUrl: '', apiKey: '', serviceAccountPath: '', openaiBaseUrl: 'https://api.openai.com' };
});

ipcMain.handle('save-config', (event, config) => {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return true;
});

async function getVertexToken(keyPath) {
  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

ipcMain.handle('call-api', async (event, { bot, prompt, config }) => {
  const { apiType, baseUrl, apiKey, serviceAccountPath, openaiBaseUrl } = config;
  
  try {
    let url, headers, body;
    
    if (apiType === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${bot.model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    } 
    else if (apiType === 'gateway') {
      url = `${baseUrl}/v1beta/models/${bot.model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
    } 
    else if (apiType === 'vertex') {
      const token = await getVertexToken(serviceAccountPath);
      let projectId = "";
      if (fs.existsSync(serviceAccountPath)) {
          const keyData = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          projectId = keyData.project_id;
      }
      url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${bot.model}:generateContent`;
      headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    }
    else if (apiType === 'openai') {
      url = `${(openaiBaseUrl || 'https://api.openai.com').replace(/\/$/, '')}/v1/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      body = JSON.stringify({
        model: bot.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: bot.systemInstruction || '' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8
      });
      const response = await fetch(url, { method: 'POST', headers, body });
      return await response.json();
    }

    body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: bot.systemInstruction + "\n\n" + prompt }] }]
    });

    const response = await fetch(url, { method: 'POST', headers, body });
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('select-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled) return null;
  return filePaths[0];
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
