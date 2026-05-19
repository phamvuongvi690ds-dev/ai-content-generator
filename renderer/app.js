let config = { bots: [] };
let editingIndex = -1;

const MODEL_OPTIONS = {
  gateway: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'imagen-3.0-generate-002', label: 'Imagen 3 Generate 002' },
    { value: 'imagen-3.0-fast-generate-001', label: 'Imagen 3 Fast Generate 001' }
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
  ],
  vertex: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'imagen-3.0-generate-002', label: 'Imagen 3 Generate 002' },
    { value: 'imagen-3.0-fast-generate-001', label: 'Imagen 3 Fast Generate 001' }
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'o4-mini', label: 'o4-mini' },
    { value: 'o3-mini', label: 'o3-mini' }
  ]
};

window.onload = async () => {
  config = await window.api.getConfig();
  // Migrate old global config into defaults if needed
  config.bots = config.bots || [];
  toggleBotApiInputs();
  updateModelOptions();
  renderBots();
};

function showTab(n) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const tabButtons = Array.from(document.querySelectorAll('.tab'));
  const targetButton = tabButtons[n - 1];
  const targetContent = document.getElementById(`tab${n}`);
  if (targetButton) targetButton.classList.add('active');
  if (targetContent) targetContent.classList.add('active');
}

function currentBotApiType() {
  return document.querySelector('input[name="botApiType"]:checked')?.value || 'gateway';
}

function updateModelOptions(selectedValue = '') {
  const type = currentBotApiType();
  const select = document.getElementById('botModel');
  if (!select) return;
  const options = MODEL_OPTIONS[type] || MODEL_OPTIONS.gateway;
  select.innerHTML = '';
  options.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = `${m.label} (${m.value})`;
    select.appendChild(opt);
  });
  if (selectedValue && !options.some(m => m.value === selectedValue)) {
    const custom = document.createElement('option');
    custom.value = selectedValue;
    custom.textContent = `Custom/current: ${selectedValue}`;
    select.appendChild(custom);
  }
  select.value = selectedValue || options[0].value;
}

function toggleBotApiInputs() {
  const type = currentBotApiType();
  document.getElementById('botGatewayGroup').style.display = type === 'gateway' ? 'block' : 'none';
  document.getElementById('botGeminiGroup').style.display = type === 'gemini' ? 'block' : 'none';
  document.getElementById('botVertexGroup').style.display = type === 'vertex' ? 'block' : 'none';
  document.getElementById('botOpenAIGroup').style.display = type === 'openai' ? 'block' : 'none';
  updateModelOptions(document.getElementById('botModel')?.value || '');
}

async function pickServiceAccount() {
  const file = await window.api.selectFile();
  if (file) document.getElementById('botServiceAccountPath').value = file;
}

function getBotFromForm() {
  const apiType = currentBotApiType();
  const keyBox = apiType === 'gemini' ? 'botApiKeysGemini' : (apiType === 'openai' ? 'botApiKeysOpenAI' : 'botApiKeysGateway');
  return {
    name: document.getElementById('botName').value.trim(),
    apiType,
    outputLanguage: document.getElementById('botOutputLanguage').value || 'en',
    model: document.getElementById('botModel').value || 'gemini-2.5-flash',
    systemInstruction: document.getElementById('systemInstruction').value.trim(),
    baseUrl: document.getElementById('botBaseUrl').value.trim(),
    geminiBaseUrl: document.getElementById('botGeminiBaseUrl').value.trim() || 'https://generativelanguage.googleapis.com',
    openaiBaseUrl: document.getElementById('botOpenAIBaseUrl').value.trim() || 'https://api.openai.com',
    serviceAccountPath: document.getElementById('botServiceAccountPath').value.trim(),
    apiKeys: (document.getElementById(keyBox)?.value || '').split(/\n+/).map(k => k.trim()).filter(Boolean),
    keyIndex: 0
  };
}

async function addBot() {
  const bot = getBotFromForm();
  if (!bot.name || !bot.systemInstruction) return alert('Nhập tên bot và system instruction.');
  if (bot.apiType !== 'vertex' && !bot.apiKeys.length) return alert('Nhập ít nhất 1 API key cho bot này.');
  if (editingIndex >= 0) config.bots[editingIndex] = bot;
  else {
    const existingIndex = config.bots.findIndex(b => b.name === bot.name);
    if (existingIndex >= 0) config.bots[existingIndex] = bot;
    else config.bots.push(bot);
  }
  await window.api.saveConfig(config);
  clearBotForm();
  renderBots();
}

function clearBotForm() {
  editingIndex = -1;
  document.getElementById('botName').value = '';
  document.getElementById('systemInstruction').value = '';
  document.getElementById('botBaseUrl').value = 'https://fisher-fare-wiley-travelling.trycloudflare.com';
  document.getElementById('botGeminiBaseUrl').value = 'https://generativelanguage.googleapis.com';
  document.getElementById('botOpenAIBaseUrl').value = 'https://api.openai.com';
  document.getElementById('botServiceAccountPath').value = '';
  document.getElementById('botApiKeysGateway').value = '';
  document.getElementById('botApiKeysGemini').value = '';
  document.getElementById('botApiKeysOpenAI').value = '';
  document.getElementById('saveBotBtn').textContent = 'Lưu Chatbot';
  updateModelOptions();
}

async function deleteBot(index) {
  if (!confirm('Xóa chatbot này?')) return;
  config.bots.splice(index, 1);
  await window.api.saveConfig(config);
  renderBots();
}

function editBot(index) {
  const bot = config.bots[index];
  editingIndex = index;
  document.querySelector(`input[name="botApiType"][value="${bot.apiType || 'gateway'}"]`).checked = true;
  toggleBotApiInputs();
  document.getElementById('botOutputLanguage').value = bot.outputLanguage || 'en';
  document.getElementById('botName').value = bot.name || '';
  updateModelOptions(bot.model || 'gemini-2.5-flash');
  document.getElementById('systemInstruction').value = bot.systemInstruction || '';
  document.getElementById('botBaseUrl').value = bot.baseUrl || '';
  document.getElementById('botGeminiBaseUrl').value = bot.geminiBaseUrl || 'https://generativelanguage.googleapis.com';
  document.getElementById('botOpenAIBaseUrl').value = bot.openaiBaseUrl || 'https://api.openai.com';
  document.getElementById('botServiceAccountPath').value = bot.serviceAccountPath || '';
  const keyText = (bot.apiKeys || []).join('\n');
  document.getElementById('botApiKeysGateway').value = bot.apiType === 'gateway' ? keyText : '';
  document.getElementById('botApiKeysGemini').value = bot.apiType === 'gemini' ? keyText : '';
  document.getElementById('botApiKeysOpenAI').value = bot.apiType === 'openai' ? keyText : '';
  document.getElementById('saveBotBtn').textContent = 'Cập nhật Chatbot';
  showTab(1);
}

function renderBots() {
  const list = document.getElementById('botList');
  const multi = document.getElementById('multiBotList');
  const rewriteSelect = document.getElementById('selectBotTab3');
  list.innerHTML = '';
  multi.innerHTML = '';
  rewriteSelect.innerHTML = '';

  if (!config.bots.length) {
    list.innerHTML = '<p style="color:#94a3b8">Chưa có chatbot nào.</p>';
    multi.innerHTML = '<p style="color:#94a3b8">Chưa có chatbot nào.</p>';
    return;
  }

  config.bots.forEach((bot, index) => {
    const div = document.createElement('div');
    div.className = 'bot-item';
    div.innerHTML = `<div><b>${bot.name}</b><br><small>${bot.apiType || 'gateway'} · ${bot.model || ''} · ${(bot.apiKeys || []).length || (bot.apiType === 'vertex' ? 'OAuth' : 0)} key</small></div><div><button onclick="editBot(${index})" class="secondary">Sửa</button> <button onclick="deleteBot(${index})" style="background:#ef4444">Xóa</button></div>`;
    list.appendChild(div);

    const label = document.createElement('label');
    label.className = 'check-item';
    label.innerHTML = `<input type="checkbox" class="multiBotCheck" value="${index}"> ${bot.name} <small>(${bot.apiType} · ${bot.model})</small>`;
    multi.appendChild(label);

    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = `${bot.name} (${bot.apiType} · ${bot.model})`;
    rewriteSelect.appendChild(opt);
  });
}

function selectedBotIndexes() {
  return Array.from(document.querySelectorAll('.multiBotCheck:checked')).map(i => Number(i.value));
}

function extractText(data) {
  return data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || JSON.stringify(data, null, 2);
}

function languageName(bot) {
  return bot.outputLanguage === 'vi' ? 'Vietnamese' : 'English';
}

async function generateContent() {
  const indexes = selectedBotIndexes();
  if (!indexes.length) return alert('Chọn ít nhất 1 chatbot để chạy.');
  const titles = document.getElementById('topic').value.split(/\n+/).map(t => t.trim()).filter(Boolean);
  if (!titles.length) return alert('Nhập ít nhất 1 tiêu đề.');

  const out = document.getElementById('outputTab2');
  out.textContent = `Đang chạy ${indexes.length} bot cho ${titles.length} tiêu đề...`;

  const tasks = [];
  for (const title of titles) {
    for (const idx of indexes) {
      const bot = config.bots[idx];
      const prompt = `Create ONE complete content piece based on this title:\nTitle: ${title}\nLength: from ${document.getElementById('minChars').value} to ${document.getElementById('maxChars').value} characters.\nWriting requirements: ${document.getElementById('requirements').value.trim() || 'None.'}\nOutput language: ${languageName(bot)}.\nReturn only the final content, no explanation.`;
      tasks.push((async () => {
        const data = await window.api.callApi({ bot, prompt });
        return `==============================\nTITLE: ${title}\nBOT: ${bot.name}\nAPI: ${bot.apiType} · MODEL: ${bot.model}\n==============================\n${extractText(data)}`;
      })());
    }
  }

  const results = await Promise.all(tasks);
  out.textContent = results.join('\n\n');
}

async function rewriteContent() {
  const bot = config.bots[Number(document.getElementById('selectBotTab3').value)];
  if (!bot) return alert('Chưa có chatbot. Hãy tạo ở Tab 1.');
  const original = document.getElementById('originalContent').value.trim();
  if (!original) return alert('Nhập nội dung gốc.');
  const prompt = `Rewrite the content below with these requirements:\nRewrite requirements: ${document.getElementById('rewriteRequirements').value.trim() || 'Rewrite naturally, clearly, better, and keep the original meaning.'}\nOutput language: ${languageName(bot)}.\n\nOriginal content:\n${original}\n\nReturn only the rewritten content, no explanation.`;
  const out = document.getElementById('outputTab3');
  out.textContent = 'Đang viết lại...';
  const data = await window.api.callApi({ bot, prompt });
  out.textContent = extractText(data);
}

async function copyOutput(id) {
  const text = document.getElementById(id).textContent || '';
  if (!text.trim()) return alert('Chưa có nội dung để copy.');
  await navigator.clipboard.writeText(text);
  alert('Đã copy nội dung.');
}

async function downloadOutput(id, filename) {
  const text = document.getElementById(id).textContent || '';
  if (!text.trim()) return alert('Chưa có nội dung để tải.');
  const saved = await window.api.saveTextFile({ filename, text });
  if (saved) alert('Đã lưu file: ' + saved);
}
