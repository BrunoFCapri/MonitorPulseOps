function getQuery(param){
  const u = new URL(window.location.href);
  return u.searchParams.get(param);
}

function withDevice(url, deviceId) {
  try {
    const u = new URL(url, window.location.origin);
    if (deviceId) u.searchParams.set('device', deviceId);
    return u.toString();
  } catch {
    const base = new URL(window.location.origin + (url.startsWith('/') ? url : ('/' + url.replace(/^\.\//, ''))));
    if (deviceId) base.searchParams.set('device', deviceId);
    return base.toString();
  }
}

async function loadJSON() {
  const base = (typeof DATA_URL !== 'undefined' && DATA_URL) ? DATA_URL : './data.json';
  const url = withDevice(base, getQuery('device') || (typeof DEFAULT_DEVICE_ID !== 'undefined' ? DEFAULT_DEVICE_ID : undefined));
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
  const cpu = (p.cpu_percent !== null && p.cpu_percent !== undefined) ? (Number(p.cpu_percent).toFixed(1) + '%') : '';
  const mem = (p.memory_percent !== null && p.memory_percent !== undefined) ? (Number(p.memory_percent).toFixed(1) + '%') : '';
  tr.innerHTML = `<td>${p.pid ?? ''}</td><td>${p.name ?? ''}</td><td>${cpu}</td><td>${mem}</td><td>${p.username ?? ''}</td><td>${(p.cmdline ?? []).join(' ')}</td>`;
        tbody.appendChild(tr);
      });
  }

  filterInput.addEventListener('input', applyFilter);
  applyFilter();
}

(async () => {
  try {
    const chosen = getQuery('device') || (typeof DEFAULT_DEVICE_ID !== 'undefined' ? DEFAULT_DEVICE_ID : undefined);
    if (chosen) {
      document.querySelectorAll('a[href$=".html"]').forEach(a => {
        try {
          const u = new URL(a.getAttribute('href'), window.location.origin);
          u.searchParams.set('device', chosen);
          a.setAttribute('href', u.pathname + u.search);
        } catch {}
      });
    }
    const data = await loadJSON();
    if (data && data.devices && Array.isArray(data.devices)) {
      const header = document.querySelector('header .text-center');
      if (header) {
        // Create selector
        const select = document.createElement('select');
        select.className = 'form-select form-select-sm bg-dark text-white';
        select.style.maxWidth = '240px';
        select.style.marginLeft = '8px';
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = 'Elegir dispositivo…';
        select.appendChild(opt0);
        data.devices.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = `${d.id} (${d.os})`;
          select.appendChild(opt);
        });
        const wrapper = document.createElement('div');
        wrapper.className = 'd-flex justify-content-center align-items-center gap-2';
        const title = header.querySelector('h3');
        if (title) {
          header.innerHTML = '';
          wrapper.appendChild(title);
          wrapper.appendChild(select);
          header.appendChild(wrapper);
        } else {
          header.appendChild(select);
        }
        select.onchange = () => {
          const id = select.value;
          if (!id) return;
          const u = new URL(window.location.href);
          u.searchParams.set('device', id);
          window.location.href = u.toString();
        };
      }
      return;
    }
    renderProcesses(data.context || data);
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
})();
