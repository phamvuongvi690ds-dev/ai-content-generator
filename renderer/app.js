let config = { bots: [] };
let editingIndex = -1;
let generatedResultsByTitle = [];
let activeResultIndex = 0;

const MODEL_OPTIONS = {
  gateway: [
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'imagen-3.0-generate-002', label: 'Imagen 3' }
  ],
  gemini: [
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }
  ],
  vertex: [
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'gpt-4o', label: 'GPT-4o' }
  ]
};

window.onload = async () => {
  config = await window.api.getConfig();
  config.bots = config.bots || [];
  toggleBotApiInputs();
  updateModelOptions();
  renderBots();
};

function showTab(n) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const btns = Array.from(document.querySelectorAll('.tab'));
  if (btns[n-1]) btns[n-1].classList.add('active');
  const contents = ['tab1', 'tab2', 'tab3'];
  const target = document.getElementById(contents[n-1]);
  if (target) target.classList.add('active');
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
  if (selectedValue) select.value = selectedValue;
}

function toggleBotApiInputs() {
  const type = currentBotApiType();
  const groups = ['botGatewayGroup', 'botGeminiGroup', 'botVertexGroup', 'botOpenAIGroup'];
  groups.forEach(g => {
    const el = document.getElementById(g);
    if(el) el.style.display = (g.toLowerCase().includes(type)) ? 'block' : 'none';
  });
  updateModelOptions();
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
    outputLanguage: document.getElementById('botOutputLanguage').value || 'vi',
    model: document.getElementById('botModel').value,
    systemInstruction: document.getElementById('systemInstruction').value.trim(),
    baseUrl: document.getElementById('botBaseUrl').value.trim(),
    geminiBaseUrl: document.getElementById('botGeminiBaseUrl').value.trim() || 'https://generativelanguage.googleapis.com',
    openaiBaseUrl: document.getElementById('botOpenAIBaseUrl').value.trim() || 'https://api.openai.com',
    serviceAccountPath: document.getElementById('botServiceAccountPath').value.trim(),
    apiKeys: (document.getElementById(keyBox)?.value || '').split('\n').map(k => k.trim()).filter(Boolean),
    keyIndex: 0
  };
}

async function addBot() {
  const bot = getBotFromForm();
  if (!bot.name) return alert('Nhập tên bot.');
  if (editingIndex >= 0) config.bots[editingIndex] = bot;
  else config.bots.push(bot);
  await window.api.saveConfig(config);
  clearBotForm();
  renderBots();
}

function clearBotForm() {
  editingIndex = -1;
  document.getElementById('botName').value = '';
  document.getElementById('systemInstruction').value = '';
  document.getElementById('saveBotBtn').textContent = 'Lưu Chatbot';
}

async function deleteBot(idx) {
  if (!confirm('Xóa bot này?')) return;
  config.bots.splice(idx, 1);
  await window.api.saveConfig(config);
  renderBots();
}

function editBot(idx) {
  editingIndex = idx;
  const bot = config.bots[idx];
  document.getElementById('botName').value = bot.name;
  document.getElementById('systemInstruction').value = bot.systemInstruction;
  document.getElementById('saveBotBtn').textContent = 'Cập nhật Chatbot';
}

function renderBots() {
  const list = document.getElementById('botList');
  const mainSelect = document.getElementById('botSelectMain');
  const tab3Select = document.getElementById('selectBotTab3');
  
  if(list) list.innerHTML = '';
  if(mainSelect) mainSelect.innerHTML = '';
  if(tab3Select) tab3Select.innerHTML = '';

  config.bots.forEach((bot, index) => {
    if(list) {
       const div = document.createElement('div');
       div.className = 'bot-item';
       div.style = 'display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #334155;';
       div.innerHTML = `<span><b>${bot.name}</b> (${bot.model})</span>
                        <div><button onclick="editBot(${index})" class="secondary">Sửa</button> 
                        <button onclick="deleteBot(${index})" style="background:#ef4444">Xóa</button></div>`;
       list.appendChild(div);
    }
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = bot.name;
    if(mainSelect) mainSelect.appendChild(opt.cloneNode(true));
    if(tab3Select) tab3Select.appendChild(opt);
  });
}

function setOutput(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || '';
  const counter = document.getElementById(id === 'outputTab2' ? 'counterTab2' : 'counterTab3');
  if (counter) counter.textContent = `${(text || '').length.toLocaleString('vi-VN')} ký tự`;
}

function showResultTab(idx) {
  activeResultIndex = idx;
  const wrap = document.getElementById('resultTabs');
  if (wrap) {
    wrap.innerHTML = '';
    generatedResultsByTitle.forEach((res, i) => {
      const btn = document.createElement('button');
      btn.className = 'result-item-btn' + (i === idx ? ' active' : '');
      btn.innerHTML = `<span class="item-num">${i+1}</span> ${res.title}`;
      btn.onclick = () => showResultTab(i);
      wrap.appendChild(btn);
    });
  }
  const item = generatedResultsByTitle[idx];
  if (item) {
    document.getElementById('tab2OutputWrap').style.display = 'block';
    setOutput('outputTab2', item.content);
  }
}

function normalizeExactLength(text, targetLen) {
  text = (text || '').trim();
  targetLen = Number(targetLen || 0);
  if (!targetLen || targetLen < 1) return text;
  if (text.length > targetLen) return text.slice(0, targetLen);
  if (text.length < targetLen) return text + ' '.repeat(targetLen - text.length);
  return text;
}

async function generateContent() {
  const botIdx = document.getElementById('botSelectMain').value;
  if (botIdx === '') return alert('Hãy chọn chatbot.');
  const titles = document.getElementById('topic').value.split('\n').map(t => t.trim()).filter(Boolean);
  if (!titles.length) return alert('Nhập tiêu đề.');

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Đang xử lý...';

  generatedResultsByTitle = titles.map(t => ({ title: t, content: 'Đang tạo nội dung...' }));
  showResultTab(0);

  const bot = config.bots[Number(botIdx)];
  const max = document.getElementById('maxChars').value;

  for (let i = 0; i < titles.length; i++) {
    const prompt = `Create content for title: ${titles[i]}. Length: EXACTLY ${max} characters. Language: ${bot.outputLanguage === 'vi' ? 'Vietnamese' : 'English'}. Return only content.`;
    const data = await window.api.callApi({ bot, prompt });
    const text = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Lỗi tạo nội dung.';
    const normalized = normalizeExactLength(text, max);
    
    generatedResultsByTitle[i].content = normalized;
    if (activeResultIndex === i) setOutput('outputTab2', normalized);
    showResultTab(activeResultIndex); // Refresh list
  }

  btn.disabled = false;
  btn.textContent = '🚀 Bắt đầu tạo nội dung';
}

async function copyOutput(id) {
  const text = document.getElementById(id).textContent;
  await navigator.clipboard.writeText(text);
  alert('Đã copy!');
}

async function downloadOutput(id, filename) {
  const text = document.getElementById(id).textContent;
  await window.api.saveTextFile({ filename, text });
  alert('Đã lưu file!');
}

async function regenerateActiveTitle() {
  const botIdx = document.getElementById('botSelectMain').value;
  const bot = config.bots[Number(botIdx)];
  const item = generatedResultsByTitle[activeResultIndex];
  setOutput('outputTab2', 'Đang tạo lại...');
  const max = document.getElementById('maxChars').value;
  const prompt = `Create content for title: ${item.title}. Length: EXACTLY ${max} characters. Language: ${bot.outputLanguage === 'vi' ? 'Vietnamese' : 'English'}. Return only content.`;
  const data = await window.api.callApi({ bot, prompt });
  const text = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Lỗi.';
  const normalized = normalizeExactLength(text, max);
  item.content = normalized;
  setOutput('outputTab2', normalized);
}

async function rewriteContent() {
  const botIdx = document.getElementById('selectBotTab3').value;
  const bot = config.bots[Number(botIdx)];
  const original = document.getElementById('originalContent').value;
  const req = document.getElementById('rewriteRequirements').value;
  setOutput('outputTab3', 'Đang viết lại...');
  const prompt = `Rewrite this: ${original}. Requirements: ${req}. Language: ${bot.outputLanguage === 'vi' ? 'Vietnamese' : 'English'}.`;
  const data = await window.api.callApi({ bot, prompt });
  const text = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Lỗi.';
  setOutput('outputTab3', text);
}
