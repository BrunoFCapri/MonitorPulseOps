async function loadJSON() {
  const url = (typeof DATA_URL !== 'undefined' && DATA_URL) ? DATA_URL : './data.json';
  const res = await fetch(url, { cache: 'no-store' });
  return await res.json();
}

function renderProcesses(ctx) {
  const tbody = document.getElementById('proc_body');
  tbody.innerHTML = '';
  const filterInput = document.getElementById('procFilter');
  const procs = (ctx.processes && Array.isArray(ctx.processes)) ? ctx.processes : [];

  function applyFilter() {
    const text = (filterInput.value || '').toLowerCase();
    tbody.innerHTML = '';
    procs
      .filter(p => !text || (p.name || '').toLowerCase().includes(text))
      .forEach(p => {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${p.pid ?? ''}</td><td>${p.name ?? ''}</td><td>${p.cpu_percent ?? ''}</td><td>${p.memory_percent ?? ''}</td><td>${p.username ?? ''}</td><td>${(p.cmdline ?? []).join(' ')}</td>`;
        tbody.appendChild(tr);
      });
  }

  filterInput.addEventListener('input', applyFilter);
  applyFilter();
}

(async () => {
  try {
    const data = await loadJSON();
    renderProcesses(data.context || data);
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
})();
