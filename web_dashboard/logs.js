async function loadJSON() {
  const url = (typeof DATA_URL !== 'undefined' && DATA_URL) ? DATA_URL : './data.json';
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
}

function renderLogs(ctx) {
  const tbody = document.getElementById('logs_body');
  tbody.innerHTML = '';
  const logs = (ctx.logs && Array.isArray(ctx.logs)) ? ctx.logs : [];
  const filterInput = document.getElementById('logFilter');
  const levelSelect = document.getElementById('logLevel');

  function apply() {
    const text = (filterInput.value || '').toLowerCase();
    const level = levelSelect.value || '';
    tbody.innerHTML = '';

    logs
      .filter(l => !level || (l.level || '').toUpperCase() === level)
      .filter(l =>
        !text ||
        (l.message && l.message.toLowerCase().includes(text)) ||
        (l.source && l.source.toLowerCase().includes(text)) ||
        (l.level && l.level.toLowerCase().includes(text))
      )
      .forEach(l => {
        const tr = document.createElement('tr');
        const time = l.time || l.timestamp || '-';
        const lvl = (l.level || '').toUpperCase();
        const src = l.source || '-';
        const msg = l.message || '-';
        tr.innerHTML = `<td>${time}</td><td>${lvl}</td><td>${src}</td><td>${msg}</td>`;
        tbody.appendChild(tr);
      });
  }

  filterInput.addEventListener('input', apply);
  levelSelect.addEventListener('change', apply);
  apply();
}

(async () => {
  try {
    const data = await loadJSON();
    renderLogs(data.context || data);
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
})();
