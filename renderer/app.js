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
  // Xử lý để tất cả các dòng văn bản dính liền nhau thành một đoạn duy nhất
  const cleanText = (text || '')
    .split(/\r?\n/)               // Chia nhỏ theo dòng
    .map(line => line.trim())     // Xóa khoảng trắng đầu cuối từng dòng
    .filter(Boolean)              // Bỏ dòng trống
    .join(' ')                    // Nối lại bằng 1 khoảng trắng duy nhất
    .replace(/\s+/g, ' ')         // Thu gọn nhiều khoảng trắng thành 1
    .trim();

  el.textContent = cleanText;
  const counter = document.getElementById(id === 'outputTab2' ? 'counterTab2' : 'counterTab3');
  if (counter) counter.textContent = `${cleanText.length.toLocaleString('vi-VN')} ký tự`;
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

function normalizeToRange(text, min, max) {
  text = (text || '').trim();
  min = Number(min || 0);
  max = Number(max || 0);
  
  // Nếu text dài hơn max, không cắt ngang xương mà tìm dấu chấm gần nhất để kết thúc câu
  if (text.length > max && max > 0) {
    let truncated = text.slice(0, max);
    const lastPunctuation = Math.max(
      truncated.lastIndexOf('.'), 
      truncated.lastIndexOf('?'), 
      truncated.lastIndexOf('!')
    );
    if (lastPunctuation > max * 0.8) { // Chỉ cắt nếu dấu câu đủ gần cuối (tránh mất quá nhiều nội dung)
      return truncated.slice(0, lastPunctuation + 1);
    }
    return truncated;
  }
  // Nếu text ngắn hơn min, giữ nguyên để AI tự điều chỉnh câu cú hoàn hảo, không bù khoảng trắng vô nghĩa
  return text;
}

async function generateContent() {
  const botIdx = document.getElementById('botSelectMain').value;
  if (botIdx === '') return alert('Hãy chọn chatbot.');
  const titles = document.getElementById('topic').value.split('\n').map(t => t.trim()).filter(Boolean);
  if (!titles.length) return alert('Nhập tiêu đề.');

  const btn = document.getElementById('generateBtn');
  const progWrap = document.getElementById('genProgressWrap');
  const progBar = document.getElementById('genProgressBar');
  const errorBox = document.getElementById('genError');

  btn.disabled = true;
  btn.textContent = '⏳ Đang xử lý...';
  progWrap.style.display = 'block';
  progBar.style.width = '0%';
  errorBox.style.display = 'none';

  generatedResultsByTitle = titles.map(t => ({ title: t, content: 'Đang tạo nội dung...' }));
  showResultTab(0);

  const bot = config.bots[Number(botIdx)];
  const min = Number(document.getElementById('minChars').value);
  const max = Number(document.getElementById('maxChars').value);
  const requirements = document.getElementById('requirements').value.trim();

  // Ngưỡng an toàn thấp hơn để ép AI phải gọi nhiều lần hơn, giúp tích tiểu thành đại
  const MAX_PER_CALL = 1800;

  for (let i = 0; i < titles.length; i++) {
    try {
      let finalContent = "";
      
      // Tăng số lượng phần lên để ép AI viết chi tiết hơn
      const numParts = Math.max(Math.ceil(max / 1500), 2); 
      
      if (numParts > 1) {
        let context = "";
        
        for (let p = 1; p <= numParts; p++) {
          const isLast = (p === numParts);
          
          // Tính toán giới hạn cho từng phần để tổng đạt ngưỡng 6500-7000
          const remaining = max - finalContent.length;
          const currentMax = isLast ? remaining : Math.min(MAX_PER_CALL, Math.ceil(remaining / (numParts - p + 1)) + 500);
          const currentMin = Math.floor(currentMax * 0.85);

          const prompt = `This is PART ${p} of ${numParts} for an EXTREMELY LONG and DETAILED content titled: "${titles[i]}".
MISSION CRITICAL: You are a "wordy" writer. You MUST describe every detail, every emotion, and every scene with extreme verbosity. 
STRICT REQUIREMENT: Write between ${currentMin} and ${currentMax} characters for THIS PART. Do not be concise.
Requirements: ${requirements || 'High quality, extremely detailed content.'}.

${context ? `PREVIOUS CONTENT CONTEXT (Do not repeat, continue the story): ...${context.slice(-2500)}\n\nCONTINUATION TASK: Pick up exactly where Part ${p-1} left off. Expand the NEXT specific chapter/detail. Do not skip any time or details.` : "STARTING TASK: Begin with a very long, immersive introduction and the first deep chapter."}

INSTRUCTION: ${isLast ? "Complete the exhaustive narrative. Ensure the total content feels like a massive, complete work. End with a full sentence." : "Write this part in overwhelming detail. Stop at a natural transition point. Part ${p+1} will continue immediately after your last word."}
Return ONLY the content text. NO titles, NO labels, NO conversational filler.`;

          const data = await window.api.callApi({ bot, prompt });
          if (data.error) throw new Error(JSON.stringify(data.error, null, 2));
          
          const partText = (data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
          finalContent += (finalContent ? "\n\n" : "") + partText;
          context += partText;
          
          // Nếu đã đạt ngưỡng max sớm thì có thể dừng (nhưng thường AI sẽ viết ngắn hơn)
          if (finalContent.length >= max && !isLast) {
             // Continue to next part anyway to ensure "Last Part" logic runs or just break if really over
          }
        }
      } else {
        // Xử lý thông thường nếu độ dài ngắn
        const prompt = `Create high-quality, engaging content for title: ${titles[i]}. 
Target length: strictly between ${min} and ${max} characters. 
Additional requirements: ${requirements || 'Output in the language implied by the title or requirements.'}.
Writing style: Ensure perfect grammar, natural flow, and a complete narrative. The content must end with a full sentence.
Return ONLY the final content. No filler, no headers.`;
        
        const data = await window.api.callApi({ bot, prompt });
        if (data.error) throw new Error(JSON.stringify(data.error, null, 2));
        finalContent = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      const normalized = normalizeToRange(finalContent, min, max);
      generatedResultsByTitle[i].content = normalized;
      if (activeResultIndex === i) setOutput('outputTab2', normalized);
      showResultTab(activeResultIndex);
      
      progBar.style.width = `${((i + 1) / titles.length) * 100}%`;
    } catch (err) {
      errorBox.textContent = `LỖI TẠI TIÊU ĐỀ "${titles[i]}":\n${err.message}`;
      errorBox.style.display = 'block';
      generatedResultsByTitle[i].content = `[LỖI]: ${err.message}`;
      if (activeResultIndex === i) setOutput('outputTab2', `[LỖI]: ${err.message}`);
    }
  }

  btn.disabled = false;
  btn.textContent = '🚀 Bắt đầu tạo nội dung';
  setTimeout(() => { progWrap.style.display = 'none'; }, 2000);
}

async function copyOutput(id) {
  const text = document.getElementById(id).textContent;
  await navigator.clipboard.writeText(text);
  alert('Đã copy!');
}

async function downloadOutput(id, filename) {
  const text = document.getElementById(id).textContent;
  // Làm sạch tên file: bỏ ký tự đặc biệt
  const safeName = (filename || 'content.txt').replace(/[/\\?%*:|"<>]/g, '-');
  await window.api.saveTextFile({ filename: safeName, text });
  alert('Đã lưu file!');
}

function downloadActiveResult() {
  const item = generatedResultsByTitle[activeResultIndex];
  if (!item) return;
  downloadOutput('outputTab2', item.title + '.txt');
}

async function regenerateActiveTitle() {
  const botIdx = document.getElementById('botSelectMain').value;
  if (botIdx === '') return alert('Hãy chọn chatbot.');
  const bot = config.bots[Number(botIdx)];
  const item = generatedResultsByTitle[activeResultIndex];
  if (!item) return;

  const outEl = document.getElementById('outputTab2');
  const errorBox = document.getElementById('genError');
  
  outEl.textContent = '⏳ Đang tạo lại...';
  errorBox.style.display = 'none';
  
  const min = document.getElementById('minChars').value;
  const max = document.getElementById('maxChars').value;
  const requirements = document.getElementById('requirements').value.trim();

  try {
    const prompt = `Create high-quality, engaging content for title: ${item.title}. 
Target length: strictly between ${min} and ${max} characters. 
Current preference: Aim for approximately ${Math.floor((Number(min)+Number(max))/2)} characters for a balanced flow.
Additional requirements: ${requirements || 'Output in the language implied by the title or requirements.'}.
Writing style: Ensure perfect grammar, natural flow, and a complete narrative. The content must end with a full sentence. Do not cut off mid-thought.
Return ONLY the final content. No filler, no headers, no conversational text.`;

    const data = await window.api.callApi({ bot, prompt });
    if (data.error) throw new Error(JSON.stringify(data.error, null, 2));
    
    const text = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Lỗi.';
    const normalized = normalizeToRange(text, min, max);
    item.content = normalized;
    setOutput('outputTab2', normalized);
  } catch (err) {
    errorBox.textContent = `LỖI KHI TẠO LẠI:\n${err.message}`;
    errorBox.style.display = 'block';
    outEl.textContent = `[LỖI]: ${err.message}`;
  }
}

async function rewriteContent() {
  const botIdx = document.getElementById('selectBotTab3').value;
  const bot = config.bots[Number(botIdx)];
  const original = document.getElementById('originalContent').value;
  const req = document.getElementById('rewriteRequirements').value;
  setOutput('outputTab3', 'Đang viết lại...');
  const prompt = `Rewrite the following content based on these requirements: ${req || 'Rewrite naturally and improve clarity.'}. 
Return only the rewritten content.

Original content:
${original}`;
  const data = await window.api.callApi({ bot, prompt });
  const text = data?.choices?.[0]?.message?.content || data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Lỗi.';
  setOutput('outputTab3', text);
}
