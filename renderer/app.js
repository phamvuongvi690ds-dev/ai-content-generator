let config = { bots: [], apiType: 'gateway', baseUrl: '', apiKey: '', serviceAccountPath: '' };

window.onload = async () => {
  config = await window.api.getConfig();
  document.querySelector(`input[name="apiType"][value="${config.apiType || 'gateway'}"]`).checked = true;
  document.getElementById('baseUrl').value = config.baseUrl || 'https://answers-name-theology-ruling.trycloudflare.com';
  document.getElementById('apiKeyGateway').value = config.apiType === 'gateway' ? (config.apiKey || '') : '';
  document.getElementById('apiKeyGemini').value = config.apiType === 'gemini' ? (config.apiKey || '') : '';
  document.getElementById('serviceAccountPath').value = config.serviceAccountPath || '';
  toggleApiInputs();
  renderBots();
};

function showTab(n) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.tab:nth-child(${n})`).classList.add('active');
  document.getElementById(`tab${n}`).classList.add('active');
}

function toggleApiInputs() {
  const type = document.querySelector('input[name="apiType"]:checked').value;
  document.getElementById('groupGateway').style.display = type === 'gateway' ? 'block' : 'none';
  document.getElementById('groupGemini').style.display = type === 'gemini' ? 'block' : 'none';
  document.getElementById('groupVertex').style.display = type === 'vertex' ? 'block' : 'none';
}

async function pickServiceAccount() {
  const file = await window.api.selectFile();
  if (file) document.getElementById('serviceAccountPath').value = file;
}

async function saveGlobalConfig() {
  const type = document.querySelector('input[name="apiType"]:checked').value;
  config.apiType = type;
  config.baseUrl = document.getElementById('baseUrl').value.trim();
  config.apiKey = type === 'gemini' ? document.getElementById('apiKeyGemini').value.trim() : document.getElementById('apiKeyGateway').value.trim();
  config.serviceAccountPath = document.getElementById('serviceAccountPath').value.trim();
  await window.api.saveConfig(config);
  alert('Đã lưu cấu hình API.');
}

async function addBot() {
  const name = document.getElementById('botName').value.trim();
  const model = document.getElementById('botModel').value.trim() || 'gemini-2.5-flash';
  const systemInstruction = document.getElementById('systemInstruction').value.trim();
  if (!name || !systemInstruction) return alert('Nhập tên bot và system instruction.');
  const existingIndex = config.bots.findIndex(b => b.name === name);
  const bot = { name, model, systemInstruction };
  if (existingIndex >= 0) config.bots[existingIndex] = bot;
  else config.bots.push(bot);
  await window.api.saveConfig(config);
  document.getElementById('botName').value = '';
  document.getElementById('botModel').value = '';
  document.getElementById('systemInstruction').value = '';
  renderBots();
}

async function deleteBot(index) {
  if (!confirm('Xóa chatbot này?')) return;
  config.bots.splice(index, 1);
  await window.api.saveConfig(config);
  renderBots();
}

function editBot(index) {
  const bot = config.bots[index];
  document.getElementById('botName').value = bot.name;
  document.getElementById('botModel').value = bot.model;
  document.getElementById('systemInstruction').value = bot.systemInstruction;
  showTab(1);
}

function renderBots() {
  const list = document.getElementById('botList');
  const selects = [document.getElementById('selectBotTab2'), document.getElementById('selectBotTab3')];
  list.innerHTML = '';
  selects.forEach(s => s.innerHTML = '');
  if (!config.bots.length) list.innerHTML = '<p style="color:#94a3b8">Chưa có chatbot nào.</p>';
  config.bots.forEach((bot, index) => {
    const div = document.createElement('div');
    div.className = 'bot-item';
    div.innerHTML = `<div><b>${bot.name}</b><br><small>${bot.model}</small></div><div><button onclick="editBot(${index})" class="secondary">Sửa</button> <button onclick="deleteBot(${index})" style="background:#ef4444">Xóa</button></div>`;
    list.appendChild(div);
    selects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = bot.name;
      s.appendChild(opt);
    });
  });
}

function getSelectedBot(selectId) { return config.bots[Number(document.getElementById(selectId).value)]; }
function extractText(data) { return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || JSON.stringify(data, null, 2); }

async function generateContent() {
  await saveGlobalConfig();
  const bot = getSelectedBot('selectBotTab2');
  if (!bot) return alert('Chưa có chatbot. Hãy tạo ở Tab 1.');
  const prompt = `Viết nội dung mới theo yêu cầu:\nTiêu đề/chủ đề: ${document.getElementById('topic').value.trim()}\nĐộ dài: từ ${document.getElementById('minChars').value} đến ${document.getElementById('maxChars').value} ký tự.\nYêu cầu: ${document.getElementById('requirements').value.trim() || 'Không có.'}\nChỉ trả về nội dung hoàn chỉnh.`;
  const out = document.getElementById('outputTab2');
  out.textContent = 'Đang tạo nội dung...';
  const data = await window.api.callApi({ bot, prompt, config });
  out.textContent = extractText(data);
}

async function rewriteContent() {
  await saveGlobalConfig();
  const bot = getSelectedBot('selectBotTab3');
  if (!bot) return alert('Chưa có chatbot. Hãy tạo ở Tab 1.');
  const original = document.getElementById('originalContent').value.trim();
  if (!original) return alert('Nhập nội dung gốc.');
  const prompt = `Viết lại nội dung dưới đây theo yêu cầu:\nYêu cầu: ${document.getElementById('rewriteRequirements').value.trim() || 'Viết lại tự nhiên, rõ ràng, hay hơn, giữ nguyên ý chính.'}\n\nNội dung gốc:\n${original}\n\nChỉ trả về nội dung đã viết lại.`;
  const out = document.getElementById('outputTab3');
  out.textContent = 'Đang viết lại...';
  const data = await window.api.callApi({ bot, prompt, config });
  out.textContent = extractText(data);
}
