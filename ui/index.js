// ─── State machine ───────────────────────────────────────────────────────────
const PANELS = ['idle', 'table', 'tech-components', 'confirm', 'htu-prompt', 'htu-context', 'htu-import', 'htu-unmatched', 'loading'];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showPanel(name) {
  PANELS.forEach(p => {
    const el = document.getElementById(`panel-${p}`);
    if (el) el.classList.toggle('active', p === name);
  });
}

// ─── State ────────────────────────────────────────────────────────────────────
let lastResult = null;
let pendingAction = null; // 'full-doc' | 'how-to-use'

// ─── Elements ─────────────────────────────────────────────────────────────────
const inspectBtn       = document.getElementById('inspectBtn');
const inspectBtn2      = document.getElementById('inspectBtn2');
const copyJsonBtn      = document.getElementById('copyJsonBtn');
const getKeyBtn        = document.getElementById('getKeyBtn');
const exportDocsBtn    = document.getElementById('exportDocsBtn');
const genDropdownBtn   = document.getElementById('genDropdownBtn');
const genDropdown      = document.getElementById('genDropdown');
const genFullItem      = document.getElementById('genFullItem');
const genPropsItem     = document.getElementById('genPropsItem');
const genHtuItem       = document.getElementById('genHtuItem');
const confirmYesBtn    = document.getElementById('confirmYesBtn');
const confirmNoBtn     = document.getElementById('confirmNoBtn');
const confirmWarnText  = document.getElementById('confirmWarnText');
const techProceedBtn   = document.getElementById('techProceedBtn');
const techCancelBtn    = document.getElementById('techCancelBtn');
const techSkipBtn      = document.getElementById('techSkipBtn');
const techCompList     = document.getElementById('techCompList');
const htuYesBtn          = document.getElementById('htuYesBtn');
const htuNoBtn           = document.getElementById('htuNoBtn');
const htuContextArea      = document.getElementById('htuContextArea');
const htuContextNextBtn   = document.getElementById('htuContextNextBtn');
const htuContextCancelBtn = document.getElementById('htuContextCancelBtn');
const htuCasesList        = document.getElementById('htuCasesList');
const htuAddCaseBtn       = document.getElementById('htuAddCaseBtn');
const htuPasteArea       = document.getElementById('htuPasteArea');
const htuImportBtn       = document.getElementById('htuImportBtn');
const htuBackBtn         = document.getElementById('htuBackBtn');
const htuCancelBtn       = document.getElementById('htuCancelBtn');


// ─── Clipboard helpers ────────────────────────────────────────────────────────
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

// ─── Inspect ──────────────────────────────────────────────────────────────────
function doInspect() {
  parent.postMessage({ pluginMessage: { type: 'inspect' } }, '*');
}
inspectBtn.onclick = doInspect;
inspectBtn2.onclick = doInspect;

// ─── Copy JSON ────────────────────────────────────────────────────────────────
copyJsonBtn.onclick = async () => {
  if (!lastResult) return;
  const ok = await copyText(JSON.stringify(lastResult, null, 2));
  if (!ok) alert('Не удалось скопировать JSON');
};

// ─── Generate dropdown ────────────────────────────────────────────────────────
function toggleGenDropdown(force) {
  const isOpen = genDropdown.classList.contains('open');
  const open = force !== undefined ? force : !isOpen;
  genDropdown.classList.toggle('open', open);
  genDropdownBtn.classList.toggle('open', open);
}

genDropdownBtn.onclick = (e) => {
  e.stopPropagation();
  toggleGenDropdown();
};

document.addEventListener('click', () => toggleGenDropdown(false));
genDropdown.addEventListener('click', (e) => e.stopPropagation());

genFullItem.onclick = () => {
  toggleGenDropdown(false);
  parent.postMessage({ pluginMessage: { type: 'find-tech-components' } }, '*');
};

genPropsItem.onclick = () => {
  toggleGenDropdown(false);
  pendingAction = 'props-only';
  parent.postMessage({ pluginMessage: { type: 'check-frames', mode: 'props' } }, '*');
};

genHtuItem.onclick = () => {
  toggleGenDropdown(false);
  htuContextArea.value = '';
  htuCasesList.innerHTML = '';
  showPanel('htu-context');
};

// ─── Tech components ──────────────────────────────────────────────────────────
let pendingTechIds = [];
let pendingTechNames = [];

function updateTechCount() {
  const checked = techCompList.querySelectorAll('input[type="checkbox"]:checked').length;
  const countEl = document.getElementById('techCompCount');
  if (countEl) countEl.textContent = checked;
}

function buildTechList(items) {
  if (!items.length) return '<div class="empty">Вложенные компоненты не найдены</div>';
  return items.map(item => `
    <label class="tech-item">
      <input type="checkbox" value="${esc(item.id)}" data-name="${esc(item.name)}" ${item.isTechnical ? 'checked' : ''}>
      <span class="tech-name">${esc(item.name)}</span>
      ${item.isTechnical ? '<span class="tech-badge">технический</span>' : ''}
    </label>
  `).join('');
}

techProceedBtn.onclick = () => {
  const checked = Array.from(techCompList.querySelectorAll('input[type="checkbox"]:checked'));
  pendingTechIds = checked.map(cb => cb.value);
  pendingTechNames = checked.map(cb => cb.dataset.name).filter(Boolean);
  parent.postMessage({ pluginMessage: { type: 'check-frames', selectedTechIds: pendingTechIds } }, '*');
};

techCancelBtn.onclick = () => showPanel('table');

techSkipBtn.onclick = () => {
  pendingTechIds = [];
  pendingTechNames = [];
  parent.postMessage({ pluginMessage: { type: 'check-frames', selectedTechIds: [] } }, '*');
};

// ─── Confirm overwrite ────────────────────────────────────────────────────────
confirmYesBtn.onclick = () => {
  showPanel('loading');
  if (pendingAction === 'props-only') {
    parent.postMessage({ pluginMessage: { type: 'generate-documentation' } }, '*');
  } else {
    pendingAction = 'full-doc';
    parent.postMessage({ pluginMessage: { type: 'generate-full-documentation', selectedTechIds: pendingTechIds } }, '*');
  }
};

confirmNoBtn.onclick = () => showPanel('table');

// ─── How to use prompt ────────────────────────────────────────────────────────
htuYesBtn.onclick = () => {
  htuContextArea.value = '';
  htuCasesList.innerHTML = '';
  showPanel('htu-context');
};

htuNoBtn.onclick = () => showPanel('table');

// ─── How to use context ───────────────────────────────────────────────────────
let caseCount = 0;

function addCaseCard() {
  caseCount++;
  const card = document.createElement('div');
  card.className = 'case-card';
  card.innerHTML = `
    <p class="case-card-title">Кейс ${caseCount}</p>
    <textarea class="text-area case-textarea" rows="2" placeholder="Опиши сценарий..."></textarea>
  `;
  htuCasesList.appendChild(card);
  card.querySelector('textarea').focus();
}

htuAddCaseBtn.onclick = addCaseCard;

htuContextNextBtn.onclick = async () => {
  if (!lastResult) return;
  const comment = htuContextArea.value.trim();
  const cases = Array.from(htuCasesList.querySelectorAll('.case-textarea'))
    .map(ta => ta.value.trim())
    .filter(Boolean);

  const techExtra = pendingTechNames.length > 0 ? { techComponents: pendingTechNames } : {};

  const hasContext = comment || cases.length > 0;
  if (!hasContext) {
    await copyText(JSON.stringify({ ...lastResult, ...techExtra }, null, 2));
  } else {
    const parts = [];
    if (comment) parts.push(comment);
    cases.forEach((c, i) => parts.push(`Кейс ${i + 1}: ${c}`));
    const payload = { ...lastResult, ...techExtra, userContext: parts.join('\n\n') };
    await copyText(JSON.stringify(payload, null, 2));
  }
  htuPasteArea.value = '';
  showPanel('htu-import');
};

htuContextCancelBtn.onclick = () => showPanel('table');

// ─── How to use import ────────────────────────────────────────────────────────
htuImportBtn.onclick = () => {
  const text = htuPasteArea.value.trim();
  if (!text) {
    alert('Вставь JSON из Claude Code перед импортом');
    return;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    alert('Не удалось разобрать JSON. Убедись что вставлен полный результат команды /generate-how-to-use');
    return;
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    alert('JSON не содержит секций. Запусти /generate-how-to-use в Claude Code заново');
    return;
  }
  pendingAction = 'how-to-use';
  showPanel('loading');
  parent.postMessage({ pluginMessage: { type: 'import-how-to-use', data } }, '*');
};

htuBackBtn.onclick = () => showPanel('htu-context');
htuCancelBtn.onclick = () => showPanel('table');

// ─── Unmatched props screen ───────────────────────────────────────────────────
const unmatchedDoneBtn = document.getElementById('unmatchedDoneBtn');
const unmatchedCopyBtn = document.getElementById('unmatchedCopyBtn');

unmatchedDoneBtn.onclick = () => showPanel('table');

unmatchedCopyBtn.onclick = async () => {
  const designText = document.getElementById('unmatchedDesignItems').innerText;
  const codeText = document.getElementById('unmatchedCodeItems').innerText;
  const text = `Дизайн → нет в коде:\n${designText}\n\nКод → нет в дизайне:\n${codeText}`;
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

// ─── Export docs ──────────────────────────────────────────────────────────────
exportDocsBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'export-docs' } }, '*');
};

async function downloadDocsZip(component, files) {
  // files: Array<{ filename: string, content: object }>
  if (!files || files.length === 0) {
    alert('Не найдено подходящих фреймов в выделении.\nВыдели фреймы "Doc / ..." и/или "How to use / ..." и попробуй снова.');
    return;
  }

  const zip = new JSZip();
  const folder = zip.folder(component);

  for (const file of files) {
    folder.file(file.filename, JSON.stringify(file.content, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${component}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Get key ──────────────────────────────────────────────────────────────────
getKeyBtn.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'get-key' } }, '*');
};


// ─── Messages from main.ts ────────────────────────────────────────────────────
window.onmessage = async (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === 'key-result') {
    alert('Key: ' + msg.key);
    return;
  }

  if (msg.type === 'export-docs-result') {
    await downloadDocsZip(msg.component, msg.files);
    return;
  }

  if (msg.type === 'progress') {
    const el = document.getElementById('loadingProgress');
    if (el) el.textContent = `Проп ${msg.current} из ${msg.total}`;
    return;
  }

  if (msg.type === 'tech-components-result') {
    if (msg.items && msg.items.length > 0) {
      techCompList.innerHTML = buildTechList(msg.items);
      updateTechCount();
      techCompList.addEventListener('change', updateTechCount);
      showPanel('tech-components');
    } else {
      // Вложенных компонентов нет — сразу проверяем фреймы
      pendingTechIds = [];
      parent.postMessage({ pluginMessage: { type: 'check-frames', selectedTechIds: [] } }, '*');
    }
    return;
  }

  if (msg.type === 'frames-check-result') {
    if (msg.selectedTechIds) pendingTechIds = msg.selectedTechIds;
    if (msg.existing && msg.existing.length > 0) {
      confirmWarnText.innerHTML =
        msg.existing.map(n => `• ${n}`).join('<br>');
      showPanel('confirm');
    } else {
      // Фреймов нет — генерируем сразу
      if (pendingAction === 'props-only') {
        showPanel('loading');
        parent.postMessage({ pluginMessage: { type: 'generate-documentation' } }, '*');
      } else {
        pendingAction = 'full-doc';
        showPanel('loading');
        parent.postMessage({ pluginMessage: { type: 'generate-full-documentation', selectedTechIds: pendingTechIds } }, '*');
      }
    }
    return;
  }

  if (msg.type === 'generation-finished') {
    if (pendingAction === 'full-doc') {
      showPanel('htu-prompt');
    } else if (pendingAction === 'how-to-use') {
      const unmatched = msg.unmatchedProps || [];
      if (unmatched.length > 0) {
        const designOnly = unmatched.filter(u => !u.codeOnly);
        const codeOnly = unmatched.filter(u => u.codeOnly);

        document.getElementById('unmatchedDesignItems').innerHTML = designOnly.length
          ? designOnly.map(u => `<div style="padding:2px 0">• ${escapeHtml(u.designName)} <span style="color:#888">(codeName: ${escapeHtml(u.codeName)})</span></div>`).join('')
          : '<div style="color:#888">—</div>';

        document.getElementById('unmatchedCodeItems').innerHTML = codeOnly.length
          ? codeOnly.map(u => `<div style="padding:2px 0">• ${escapeHtml(u.codeName)}: <span style="color:#888">${escapeHtml(u.type)}</span></div>`).join('')
          : '<div style="color:#888">—</div>';

        showPanel('htu-unmatched');
      } else {
        showPanel('table');
      }
    } else {
      showPanel('table');
    }
    pendingAction = null;
    return;
  }

  if (msg.type === 'result') {
    lastResult = msg.data;

    if (msg.data?.error) {
      showPanel('idle');
      return;
    }

    const data = msg.data;
    const props = data.props || [];
    const validation = data.validation || {};

    // Заголовок компонента
    const rawName = data.component || '—';
    // Убираем префикс типа если есть (COMPONENT_SET., COMPONENT.)
    const cleanName = rawName.replace(/^(COMPONENT_SET|COMPONENT)\./i, '');
    // Версия — из описания если есть паттерн v0.0 или version
    const versionMatch = (data.description || '').match(/v\d+[\.\d]*/i);
    const version = versionMatch ? versionMatch[0] : '';

    const nameEl = document.getElementById('componentName');
    const versionEl = document.getElementById('componentVersion');
    if (nameEl) nameEl.textContent = cleanName;
    if (versionEl) versionEl.textContent = version;

    // Статистика
    document.getElementById('statTotal').textContent  = validation.total   || 0;
    document.getElementById('statOk').textContent     = validation.ok      || 0;
    document.getElementById('statReview').textContent = validation.review   || 0;
    document.getElementById('statWrong').textContent  = validation.wrongCase || 0;
    document.getElementById('statUnknown').textContent= validation.unknown  || 0;

    const tableContainer = document.getElementById('tableContainer');
    if (tableContainer) {
      tableContainer.innerHTML = buildTable(props);
      tableContainer.className = '';
    }

    showPanel('table');
    return;
  }
};

// ─── Table builder ────────────────────────────────────────────────────────────
function buildTable(props) {
  if (!props?.length) return '<div class="empty">Пропы не найдены</div>';

  const rows = props.map(prop => {
    const cls =
      prop.status === 'WRONG_CASE' ? 'status-wrong_case' :
      prop.status === 'REVIEW'     ? 'status-review' :
      prop.status === 'UNKNOWN'    ? 'status-unknown' : '';
    return `
      <tr class="${cls}">
        <td>${esc(prop.pixsoName ?? '')}</td>
        <td>${esc(prop.status === 'UNKNOWN' ? '' : (prop.designName ?? ''))}</td>
        <td>${esc(fmtValues(prop.values))}</td>
        <td>${esc(prop.status ?? '')}</td>
      </tr>`;
  }).join('');

  return `
    <table>
      <thead>
        <tr><th>Pixso</th><th>Стандарт</th><th>Values</th><th>Status</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function fmtValues(values) {
  if (!values) return '';
  if (Array.isArray(values)) return values.join(', ');
  if (typeof values === 'object') return Object.keys(values).join(', ');
  return String(values);
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
