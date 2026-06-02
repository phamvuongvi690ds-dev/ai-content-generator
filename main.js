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


function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function isRetryableError(data) {
  const code = data?.error?.code;
  const status = data?.error?.status;
  return code === 429 || code === 500 || code === 502 || code === 503 || code === 504 || status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED';
}

function fallbackModels(apiType, model) {
  const list = apiType === 'openai'
    ? ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini']
    : ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-pro'];
  return [model, ...list.filter(m => m !== model)];
}

async function getVertexToken(keyPath) {
  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function callApiGeneric({ bot, prompt }) {
  const { apiType, baseUrl, apiKeys, keyIndex, serviceAccountPath, geminiBaseUrl, openaiBaseUrl, systemInstruction } = bot;
  const keys = apiKeys && apiKeys.length ? apiKeys : [''];
  const models = fallbackModels(apiType, bot.model || (apiType === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash'));
  let lastData = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const apiKey = keys[((keyIndex || 0) + attempt) % keys.length];
      try {
        let url, headers, body;
        
        if (apiType === 'gemini') {
          const base = (geminiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
          url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;
          headers = { 'Content-Type': 'application/json' };
          body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: (systemInstruction || '') + "\n\n" + prompt }] }] });
        } else if (apiType === 'gateway') {
          const base = (baseUrl || 'https://fisher-fare-wiley-travelling.trycloudflare.com').replace(/\/$/, '');
          url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;
          headers = { 'Content-Type': 'application/json' };
          body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: (systemInstruction || '') + "\n\n" + prompt }] }] });
        } else if (apiType === 'vertex') {
          const token = await getVertexToken(serviceAccountPath);
          const keyData = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${keyData.project_id}/locations/us-central1/publishers/google/models/${model}:generateContent`;
          headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
          body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: (systemInstruction || '') + "\n\n" + prompt }] }] });
        } else if (apiType === 'openai') {
          url = `${(openaiBaseUrl || 'https://api.openai.com').replace(/\/$/, '')}/v1/chat/completions`;
          headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
          body = JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstruction || '' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8
          });
        }

        const response = await fetch(url, { method: 'POST', headers, body });
        const data = await response.json();
        lastData = data;
        if (!data?.error) {
          if (model !== bot.model) data._fallbackModelUsed = model;
          return data;
        }
        if (!isRetryableError(data)) return data;
        await sleep(1500 * (attempt + 1));
      } catch (error) {
        lastData = { error: error.message };
        await sleep(1000 * (attempt + 1));
      }
    }
  }
  return lastData || { error: 'All retries failed.' };
}

ipcMain.handle('call-api', async (event, { bot, prompt }) => {
  return await callApiGeneric({ bot, prompt });
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
