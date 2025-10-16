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

function fmtBytes(bytes) {
  if (bytes === null || bytes === undefined) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let num = Number(bytes);
  while (num >= 1024 && i < units.length - 1) { num /= 1024; i++; }
  return `${num.toFixed(1)} ${units[i]}`;
}

function renderDisks(ctx) {
  const tbody = document.getElementById('disks_body');
  tbody.innerHTML = '';
  const di = ctx.disk_info || {};
  const disks = Array.isArray(di.partitions) ? di.partitions : Object.values(di);
  const usageMap = di.usage || {};

  disks.forEach(d => {
    const device = d.device || d.mounted || d.mountpoint || d.name || 'N/A';
    const mount = d.mountpoint || d.mounted || d.device || '-';
    const inlineTotal = d.total, inlineUsed = d.used, inlineFree = d.free, inlinePct = d.percent;
    const u = (usageMap[mount] || usageMap[device] || {});
    const total = fmtBytes(inlineTotal ?? u.total);
    const used = fmtBytes(inlineUsed ?? u.used);
    const free = fmtBytes(inlineFree ?? u.free);
    const pctVal = inlinePct ?? u.percent;
    const pct = (pctVal !== undefined) ? `${(pctVal.toFixed ? pctVal.toFixed(1) : Number(pctVal).toFixed(1))}%` : '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${device}</td><td>${mount}</td><td>${total}</td><td>${used}</td><td>${free}</td><td>${pct}</td>`;
    tbody.appendChild(tr);
  });
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
    renderDisks(data.context || data);
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
})();
