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
  // Migrate old global config into defaults if needed
  config.bots = config.bots || [];
  toggleBotApiInputs();
  updateModelOptions();
  renderBots();
  setOutput('outputTab2', document.getElementById('outputTab2')?.textContent || '');
  setOutput('outputTab3', document.getElementById('outputTab3')?.textContent || '');
};

function showTab(n) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  const targetButton = tabButtons[n - 1];
  const targetContent = document.getElementById(`tab${n}`);
  if (targetButton) targetButton.classList.add('active');
  if (targetContent) targetContent.classList.add('active');
  const titles = {
    1: ['Cấu hình Chatbot', 'Quản lý và thiết lập các trợ lý AI'],
    2: ['Sáng tạo nội dung', 'Tạo nội dung hàng loạt theo nhiều tiêu đề'],
    3: ['Viết lại nội dung', 'Tối ưu và viết lại văn bản bằng AI']
  };
  document.getElementById('pageTitle').textContent = titles[n]?.[0] || '';
  document.getElementById('pageSub').textContent = titles[n]?.[1] || '';
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

    // Populate the 4 grid selects
    for(let i=0; i<4; i++) {
      const sBox = document.getElementById(`botSelect_${i}`);
      if(sBox) {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = bot.name;
        sBox.appendChild(opt);
      }
    }

    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = `${bot.name} (${bot.apiType} · ${bot.model})`;
    rewriteSelect.appendChild(opt);
  });

}

function selectedBotIndexes() {
  return [0, 1, 2, 3].map(i => Number(document.getElementById(`botSelect_${i}`).value));
}

function extractText(data) {
  const text = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || JSON.stringify(data, null, 2);
  return data?._fallbackModelUsed ? `[Fallback model used: ${data._fallbackModelUsed}]\n\n${text}` : text;
}

function setOutput(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || '';
  const counterId = id === 'outputTab2' ? 'counterTab2' : (id === 'outputTab3' ? 'counterTab3' : null);
  if (counterId) {
    const counter = document.getElementById(counterId);
    const count = (text || '').length;
    if (counter) counter.textContent = `Bộ đếm: ${count.toLocaleString('vi-VN')} ký tự`;
  }
}

function languageName(bot) {
  return bot.outputLanguage === 'vi' ? 'Vietnamese' : 'English';
}

function normalizeExactLength(text, targetLen) {
  text = (text || '').trim();
  targetLen = Number(targetLen || 0);
  if (!targetLen || targetLen < 1) return text;
  if (text.length > targetLen) return text.slice(0, targetLen).trimEnd();
  return text;
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
    btn.innerHTML = `<span class="item-num">${idx + 1}</span> ${item.title}`;
    btn.onclick = () => showResultTab(idx);
    wrap.appendChild(btn);
  });
}

function showResultTab(idx) {
  activeResultIndex = idx;
  renderResultTabs();
  const item = generatedResultsByTitle[idx];
  if (!item) return;
  // Split content if it contains double newlines (multiple bots) or just repeat
  const parts = (item.content || '').split('\n\n').filter(Boolean);
  for(let i=0; i<4; i++) {
    setGridOutput(i, parts[i] || (parts.length > 0 ? parts[0] : ''));
  }
}

async function regenerateActiveTitle() {
  const indexes = selectedBotIndexes();
  if (!indexes.length) return alert('Chọn chatbot để tạo lại.');
  const item = generatedResultsByTitle[activeResultIndex];
  if (!item) return;

  document.getElementById('tab2Actions').style.display = 'none';
  
  item.content = 'Đang tạo lại nội dung...';
  setOutput('outputTab2', item.content);

  const perTitleTasks = indexes.map(async idx => {
    const bot = config.bots[idx];
    const targetChars = Number(document.getElementById('maxChars').value || 1000);
    const prompt = `Create ONE complete content piece based on this title:\nTitle: ${item.title}\nRequired length: EXACTLY ${targetChars} characters. Match the maximum value exactly.\nWriting requirements: ${document.getElementById('requirements').value.trim() || 'None.'}\nOutput language: ${languageName(bot)}.\nReturn only the final content, no explanation, no title header, no markdown.`;
    const data = await window.api.callApi({ bot, prompt });
    if (bot.apiKeys && bot.apiKeys.length) bot.keyIndex = ((bot.keyIndex || 0) + 1) % bot.apiKeys.length;
    return normalizeExactLength(extractText(data), document.getElementById('maxChars').value);
  });

  const results = await Promise.all(perTitleTasks);
  item.content = results.join('\n\n');
  setOutput('outputTab2', item.content);
  
  btn.disabled = false;
  btn.textContent = '🔄 Tạo lại tab này';
}

async function generateContent() {
  const indexes = selectedBotIndexes();
  if (!indexes.length) return alert('Chọn ít nhất 1 chatbot để chạy.');
  const titles = document.getElementById('topic').value.split(/\n+/).map(t => t.trim()).filter(Boolean);
  if (!titles.length) return alert('Nhập ít nhất 1 tiêu đề.');

  generatedResultsByTitle = titles.map(t => ({ title: t, content: 'Đang tạo nội dung...' }));
  activeResultIndex = 0;
  renderResultTabs();
  showResultTab(0);

  const allResults = [];
  for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
    const title = titles[titleIndex];
    const perTitleTasks = [0, 1, 2, 3].map(async gridIdx => {
      const botIdx = Number(document.getElementById(`botSelect_${gridIdx}`).value);
      const bot = config.bots[botIdx];
      const targetChars = Number(document.getElementById('maxChars').value || 1000);
      const prompt = `Create ONE complete content piece based on this title:\nTitle: ${title}\nRequired length: EXACTLY ${targetChars} characters, not less and not more. The minimum field is only a reference; the final output must match the maximum value exactly.\nWriting requirements: ${document.getElementById('requirements').value.trim() || 'None.'}\nOutput language: ${languageName(bot)}.\nReturn only the final content, no explanation, no title header, no markdown.`;
      const data = await window.api.callApi({ bot, prompt });
      if (bot.apiKeys && bot.apiKeys.length) bot.keyIndex = ((bot.keyIndex || 0) + 1) % bot.apiKeys.length;
      return normalizeExactLength(extractText(data), document.getElementById('maxChars').value);
    });

    const results = await Promise.all(perTitleTasks);
    const content = results.join('\n\n');
    generatedResultsByTitle[titleIndex].content = content;
    renderResultTabs();
    if (activeResultIndex === titleIndex) showResultTab(titleIndex);
  }

  // Nếu người dùng bấm tải/copy khi không chọn tab, vẫn giữ tab đang xem; data tất cả nằm trong generatedResultsByTitle.
  showResultTab(activeResultIndex);
}


async function rewriteContent() {
  const bot = config.bots[Number(document.getElementById('selectBotTab3').value)];
  if (!bot) return alert('Chưa có chatbot. Hãy tạo ở Tab 1.');
  const original = document.getElementById('originalContent').value.trim();
  if (!original) return alert('Nhập nội dung gốc.');
  const prompt = `Rewrite the content below with these requirements:\nRewrite requirements: ${document.getElementById('rewriteRequirements').value.trim() || 'Rewrite naturally, clearly, better, and keep the original meaning.'}\nOutput language: ${languageName(bot)}.\n\nOriginal content:\n${original}\n\nReturn only the rewritten content, no explanation.`;
  const out = document.getElementById('outputTab3');
  setOutput('outputTab3', 'Đang viết lại...');
  const data = await window.api.callApi({ bot, prompt });
  setOutput('outputTab3', extractText(data));
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


function setGridOutput(index, text) {
  const el = document.getElementById(`output_grid_${index}`);
  if (!el) return;
  el.textContent = text || '';
  const counter = document.getElementById(`counter_grid_${index}`);
  if (counter) counter.textContent = `${(text || '').length.toLocaleString('vi-VN')} ký tự`;
}

async function copyGrid(index) {
  const text = document.getElementById(`output_grid_${index}`).textContent || '';
  if (!text.trim() || text.includes('Đang')) return alert('Chưa có nội dung.');
  await navigator.clipboard.writeText(text);
  alert('Đã copy!');
}

async function downloadGrid(index) {
  const text = document.getElementById(`output_grid_${index}`).textContent || '';
  if (!text.trim() || text.includes('Đang')) return alert('Chưa có nội dung.');
  const saved = await window.api.saveTextFile({ filename: `result-${index+1}.txt`, text });
  if (saved) alert('Đã lưu file!');
}

async function regenerateGrid(gridIdx) {
  const indexes = selectedBotIndexes();
  if (!indexes.length) return alert('Chọn ít nhất 1 bot.');
  const item = generatedResultsByTitle[activeResultIndex];
  if (!item) return;

  setGridOutput(gridIdx, 'Đang tạo lại...');
  const botIdx = Number(document.getElementById(`botSelect_${gridIdx}`).value);
  const bot = config.bots[botIdx];
  const targetChars = Number(document.getElementById('maxChars').value || 1000);
  const prompt = `Create ONE complete content piece based on this title:\nTitle: ${item.title}\nRequired length: EXACTLY ${targetChars} characters. Match the maximum value exactly.\nWriting requirements: ${document.getElementById('requirements').value.trim() || 'None.'}\nOutput language: ${languageName(bot)}.\nReturn only the final content, no explanation, no title header, no markdown.`;
  
  const data = await window.api.callApi({ bot, prompt });
  const result = normalizeExactLength(extractText(data), document.getElementById('maxChars').value);
  
  // Update internal state (this is tricky as we now have 4 variants per title?)
  // For now let's just update the grid view.
  setGridOutput(gridIdx, result);
}
