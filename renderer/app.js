let config = { bots: [] };
let editingIndex = -1;

const MODEL_OPTIONS = {
  gateway: [
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'imagen-3.0-generate-002', label: 'Imagen 3 Generate 002' },
    { value: 'imagen-3.0-fast-generate-001', label: 'Imagen 3 Fast Generate 001' }
  ],
  gemini: [
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
  ],
  vertex: [
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
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
  config.bots = config.bots || [];
  toggleBotApiInputs();
  updateModelOptions();
  renderBots();
  setOutput('outputTab2', document.getElementById('outputTab2')?.textContent || '');
  setOutput('outputTab3', document.getElementById('outputTab3')?.textContent || '');
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
  const checked = document.querySelector('input[name="botApiType"]:checked');
  return checked ? checked.value : 'gateway';
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
    custom.textContent = `Custom: ${selectedValue}`;
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
  const keyBox = apiType === 'gemini' ? 'botApiKeysGemini' : (apiType === 'openai' ? 'botApiKeysOpenAI' : (apiType === 'gateway' ? 'botApiKeysGateway' : ''));
  return {
    name: document.getElementById('botName').value.trim(),
    apiType,
    outputLanguage: document.getElementById('botOutputLanguage').value || 'en',
    model: document.getElementById('botModel').value || 'gemini-3.5-flash',
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
  if (!bot.name || !bot.systemInstruction) return alert('Nhập tên bot và hướng dẫn AI.');
  if (bot.apiType !== 'vertex' && bot.apiKeys.length === 0) return alert('Nhập ít nhất 1 API key.');
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
  editingIndex = index;
  const bot = config.bots[index];
  document.getElementById('botName').value = bot.name;
  const radios = document.querySelectorAll('input[name="botApiType"]');
  radios.forEach(r => { if (r.value === bot.apiType) r.checked = true; });
  toggleBotApiInputs();
  document.getElementById('botModel').value = bot.model;
  document.getElementById('botOutputLanguage').value = bot.outputLanguage || 'en';
  document.getElementById('systemInstruction').value = bot.systemInstruction;
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
  const rewriteSelect = document.getElementById('selectBotTab3');
  const botSelectMain = document.getElementById('botSelectMain');
  list.innerHTML = '';
  if(rewriteSelect) rewriteSelect.innerHTML = '';
  if(botSelectMain) botSelectMain.innerHTML = '';

  if (!config.bots.length) {
    list.innerHTML = '<p style="color:#94a3b8">Chưa có chatbot nào.</p>';
    return;
  }

  config.bots.forEach((bot, index) => {
    const div = document.createElement('div');
    div.className = 'bot-item';
    div.innerHTML = `<div><b>${bot.name}</b><br><small>${bot.apiType || 'gateway'} · ${bot.model || ''}</small></div><div><button onclick="editBot(${index})" class="secondary">Sửa</button> <button onclick="deleteBot(${index})" style="background:#ef4444">Xóa</button></div>`;
    list.appendChild(div);

    if(botSelectMain) {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = bot.name;
      botSelectMain.appendChild(opt);
    }

    if(rewriteSelect) {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = `${bot.name} (${bot.apiType} · ${bot.model})`;
      rewriteSelect.appendChild(opt);
    }
  });
}

function extractText(data) {
  const text = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || JSON.stringify(data, null, 2);
  return data?._fallbackModelUsed ? `[Fallback model used: ${data._fallbackModelUsed}]\n\n${text}` : text;
}

function setOutput(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || '';
}

function normalizeExactLength(text, targetLen) {
  text = (text || '').trim();
  targetLen = Number(targetLen || 0);
  if (!targetLen || targetLen < 1) return text;
  if (text.length > targetLen) return text.slice(0, targetLen).trimEnd();
  return text;
}

function languageName(bot) {
  return bot.outputLanguage === 'vi' ? 'Vietnamese' : 'English';
}

let generatedResultsByTitle = [];
let activeResultIndex = 0;

function renderResultTabs() {
  const wrap = document.getElementById('resultTabs');
  if (!wrap) return;
  wrap.innerHTML = '';
  generatedResultsByTitle.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'result-item-btn' + (idx === activeResultIndex ? ' active' : '');
    btn.innerHTML = '<span class="item-num">' + (idx + 1) + '</span> ' + item.title;
    btn.onclick = () => showResultTab(idx);
    wrap.appendChild(btn);
  });
}

function showResultTab(idx) {
  activeResultIndex = idx;
  renderResultTabs();
  const resultsList = document.getElementById('resultsList');
  if (!resultsList) return;
  
  const cards = resultsList.querySelectorAll('.result-card-full');
  cards.forEach((card, i) => {
    card.style.display = (i === idx) ? 'flex' : 'none';
  });
  
  const item = generatedResultsByTitle[idx];
  if (item && !item.content.includes('Đang')) {
     const outEl = document.getElementById(`output_res_${idx}`);
     const countEl = document.getElementById(`counter_res_${idx}`);
     if(outEl) outEl.textContent = item.content;
     if(countEl) countEl.textContent = `${item.content.length.toLocaleString('vi-VN')} ký tự`;
  }
}

async function copyResult(idx) {
  const text = generatedResultsByTitle[idx].content;
  if (!text || text.includes('Đang')) return;
  await navigator.clipboard.writeText(text);
  alert('Đã copy!');
}

async function downloadResult(idx) {
  const item = generatedResultsByTitle[idx];
  if (!item.content || item.content.includes('Đang')) return;
  const saved = await window.api.saveTextFile({ filename: `${item.title.slice(0,20)}.txt`, text: item.content });
  if (saved) alert('Đã lưu file!');
}

async function regenerateResult(idx) {
  const botIdx = document.getElementById('botSelectMain').value;
  const bot = config.bots[Number(botIdx)];
  const item = generatedResultsByTitle[idx];
  
  const outEl = document.getElementById(`output_res_${idx}`);
  if(outEl) outEl.textContent = 'Đang tạo lại...';
  
  const targetChars = Number(document.getElementById('maxChars').value || 1000);
  const prompt = `Create ONE complete content piece based on this title:\nTitle: ${item.title}\nRequired length: EXACTLY ${targetChars} characters. Match the maximum value exactly.\nWriting requirements: ${document.getElementById('requirements').value.trim() || 'None.'}\nOutput language: ${languageName(bot)}.\nReturn only the final content, no explanation, no title header, no markdown.`;
  
  const data = await window.api.callApi({ bot, prompt });
  const result = normalizeExactLength(extractText(data), document.getElementById('maxChars').value);
  
  generatedResultsByTitle[idx].content = result;
  if(outEl) outEl.textContent = result;
  const countEl = document.getElementById(`counter_res_${idx}`);
  if(countEl) countEl.textContent = `${result.length.toLocaleString('vi-VN')} ký tự`;
}

async function generateContent() {
  const botIdx = document.getElementById('botSelectMain').value;
  if (botIdx === '') return alert('Chọn chatbot.');
  const bot = config.bots[Number(botIdx)];
  const titles = document.getElementById('topic').value.split(/\n+/).map(t => t.trim()).filter(Boolean);
  if (!titles.length) return alert('Nhập danh sách tiêu đề.');

  const resultsList = document.getElementById('resultsList');
  resultsList.innerHTML = '';
  
  generatedResultsByTitle = titles.map(t => ({ title: t, content: 'Đang tạo nội dung...' }));

  titles.forEach((title, idx) => {
    const card = document.createElement('div');
    card.className = 'result-card-full';
    card.id = `result_card_${idx}`;
    card.innerHTML = `
      <div class="result-card-header">
        <span class="result-card-title">${idx + 1}. ${title}</span>
        <span class="char-counter-mini" id="counter_res_${idx}">0 ký tự</span>
      </div>
      <div id="output_res_${idx}" class="result-card-body">Đang tạo...</div>
      <div class="result-card-footer">
        <button class="secondary" onclick="copyResult(${idx})">📋 Copy</button>
        <button class="secondary" onclick="downloadResult(${idx})">💾 Tải .txt</button>
        <button class="btn-primary" onclick="regenerateResult(${idx})">🔄 Tạo lại</button>
      </div>
    `;
    resultsList.appendChild(card);
    card.style.display = 'none';
  });

  renderResultTabs();
  showResultTab(0);

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const targetChars = Number(document.getElementById('maxChars').value || 1000);
    const prompt = `Create ONE complete content piece based on this title:\nTitle: ${title}\nRequired length: EXACTLY ${targetChars} characters. Match the maximum value exactly.\nWriting requirements: ${document.getElementById('requirements').value.trim() || 'None.'}\nOutput language: ${languageName(bot)}.\nReturn only the final content, no explanation, no title header, no markdown.`;
    
    const data = await window.api.callApi({ bot, prompt });
    const result = normalizeExactLength(extractText(data), document.getElementById('maxChars').value);
    
    generatedResultsByTitle[i].content = result;
    const outEl = document.getElementById(`output_res_${i}`);
    if (outEl) outEl.textContent = result;
    const countEl = document.getElementById(`counter_res_${i}`);
    if (countEl) countEl.textContent = `${result.length.toLocaleString('vi-VN')} ký tự`;
    renderResultTabs();
  }
}

async function rewriteContent() {
  const botIdx = document.getElementById('selectBotTab3').value;
  const bot = config.bots[Number(botIdx)];
  if (!bot) return alert('Chưa có chatbot. Hãy tạo ở Tab 1.');
  const original = document.getElementById('originalContent').value.trim();
  if (!original) return alert('Nhập nội dung gốc.');
  const prompt = `Rewrite the content below with these requirements:\nRewrite requirements: ${document.getElementById('rewriteRequirements').value.trim() || 'Rewrite naturally, clearly, better, and keep the original meaning.'}\nOutput language: ${languageName(bot)}.\n\nOriginal content:\n${original}\n\nReturn only the rewritten content, no explanation.`;
  const data = await window.api.callApi({ bot, prompt });
  const out = document.getElementById('outputTab3');
  if(out) out.textContent = extractText(data);
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

document.addEventListener('mousedown', (e) => {
  const editable = e.target.closest('input, textarea, select');
  if (editable && document.activeElement !== editable && typeof editable.focus === 'function') {
    setTimeout(() => editable.focus(), 0);
  }
}, false);
