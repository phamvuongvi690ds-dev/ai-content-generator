let config = { bots: [], baseUrl: '', apiKey: '' };

window.onload = async () => {
  config = await window.api.getConfig();
  document.getElementById('baseUrl').value = config.baseUrl || 'https://answers-name-theology-ruling.trycloudflare.com';
  document.getElementById('apiKey').value = config.apiKey || '';
  renderBots();
};

function showTab(n) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.tab:nth-child(${n})`).classList.add('active');
  document.getElementById(`tab${n}`).classList.add('active');
}

async function saveGlobalConfig() {
  config.baseUrl = document.getElementById('baseUrl').value.trim();
  config.apiKey = document.getElementById('apiKey').value.trim();
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

  if (!config.bots.length) {
    list.innerHTML = '<p style="color:#94a3b8">Chưa có chatbot nào.</p>';
  }

  config.bots.forEach((bot, index) => {
    const div = document.createElement('div');
    div.className = 'bot-item';
    div.innerHTML = `
      <div><div class="bot-name">${bot.name}</div><small>${bot.model}</small></div>
      <div><button onclick="editBot(${index})" class="secondary">Sửa</button><button onclick="deleteBot(${index})" style="background:#ef4444;margin-left:5px">Xóa</button></div>
    `;
    list.appendChild(div);

    selects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = bot.name;
      s.appendChild(opt);
    });
  });
}

function getSelectedBot(selectId) {
  const index = Number(document.getElementById(selectId).value);
  return config.bots[index];
}

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || JSON.stringify(data, null, 2);
}

async function generateContent() {
  const bot = getSelectedBot('selectBotTab2');
  if (!bot) return alert('Chưa có chatbot. Hãy tạo ở Tab 1.');

  const minChars = document.getElementById('minChars').value;
  const maxChars = document.getElementById('maxChars').value;
  const topic = document.getElementById('topic').value.trim();
  const requirements = document.getElementById('requirements').value.trim();
  if (!topic) return alert('Nhập tiêu đề/chủ đề.');

  const prompt = `Viết nội dung mới theo yêu cầu sau:\n\nTiêu đề/chủ đề: ${topic}\nĐộ dài: từ ${minChars} đến ${maxChars} ký tự.\nYêu cầu viết: ${requirements || 'Không có yêu cầu thêm.'}\n\nChỉ trả về nội dung hoàn chỉnh, không giải thích.`;
  const out = document.getElementById('outputTab2');
  out.textContent = 'Đang tạo nội dung...';
  const data = await window.api.callApi({ bot, prompt, baseUrl: config.baseUrl, apiKey: config.apiKey });
  out.textContent = extractText(data);
}

async function rewriteContent() {
  const bot = getSelectedBot('selectBotTab3');
  if (!bot) return alert('Chưa có chatbot. Hãy tạo ở Tab 1.');

  const original = document.getElementById('originalContent').value.trim();
  const req = document.getElementById('rewriteRequirements').value.trim();
  if (!original) return alert('Nhập nội dung gốc.');

  const prompt = `Viết lại nội dung dưới đây theo yêu cầu:\n\nYêu cầu viết lại: ${req || 'Viết lại tự nhiên, rõ ràng, hay hơn, giữ nguyên ý chính.'}\n\nNội dung gốc:\n${original}\n\nChỉ trả về nội dung đã viết lại, không giải thích.`;
  const out = document.getElementById('outputTab3');
  out.textContent = 'Đang viết lại...';
  const data = await window.api.callApi({ bot, prompt, baseUrl: config.baseUrl, apiKey: config.apiKey });
  out.textContent = extractText(data);
}
