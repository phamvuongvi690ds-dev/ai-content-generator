const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
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
  return { bots: [] };
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

ipcMain.handle('call-api', async (event, { bot, prompt }) => {
  // Use the bot's internal config instead of a global one
  const { apiType, baseUrl, apiKeys, keyIndex, serviceAccountPath, geminiBaseUrl, openaiBaseUrl, model, systemInstruction } = bot;
  
  // Rotate keys if multiple keys exist
  let apiKey = "";
  if (apiKeys && apiKeys.length) {
    const idx = (keyIndex || 0) % apiKeys.length;
    apiKey = apiKeys[idx];
    // We don't update the config file here to avoid excessive writes during parallel calls,
    // but the caller can handle state if needed. For now, we use a simple selection.
  }

  try {
    let url, headers, body;
    
    if (apiType === 'gemini') {
      url = `${(geminiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '')}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
      body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + prompt }] }]
      });
    } 
    else if (apiType === 'gateway') {
      url = `${(baseUrl || '').replace(/\/$/, '')}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      headers = { 'Content-Type': 'application/json' };
      body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + prompt }] }]
      });
    } 
    else if (apiType === 'vertex') {
      const token = await getVertexToken(serviceAccountPath);
      let projectId = "";
      if (fs.existsSync(serviceAccountPath)) {
          const keyData = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          projectId = keyData.project_id;
      }
      url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${model}:generateContent`;
      headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      body = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: systemInstruction + "\n\n" + prompt }] }]
      });
    }
    else if (apiType === 'openai') {
      url = `${(openaiBaseUrl || 'https://api.openai.com').replace(/\/$/, '')}/v1/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      body = JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction || '' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8
      });
    }

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

ipcMain.handle('save-text-file', async (event, { filename, text }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: filename || 'ai-content.txt',
    filters: [{ name: 'Text', extensions: ['txt'] }]
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, text || '', 'utf8');
  return filePath;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
