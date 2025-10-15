async function loadJSON() {
  const url = (typeof DATA_URL !== 'undefined' && DATA_URL) ? DATA_URL : './data.json';
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

function renderNetwork(ctx) {
  const tbody = document.getElementById('nics_body');
  tbody.innerHTML = '';

  const ni = ctx.network_info || {};
  const interfaces = Array.isArray(ni.interfaces)
    ? ni.interfaces
    : Object.values(ni);
  const io = ni.io_counters || {};

  interfaces.forEach(nic => {
    const name = nic.name || nic.iface || 'N/A';
    const ip = nic.ip || nic.ip_address || nic.address || '-';
    const sentRaw = nic.sent_bytes ?? (io[name] ? io[name].bytes_sent : undefined);
    const recvRaw = nic.received_bytes ?? (io[name] ? io[name].bytes_recv : undefined);
    const sent = fmtBytes(sentRaw);
    const recv = fmtBytes(recvRaw);

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${name}</td><td>${ip}</td><td>${sent}</td><td>${recv}</td>`;
    tbody.appendChild(tr);
  });
}

(async () => {
  try {
    const data = await loadJSON();
    renderNetwork(data.context || data);
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
})();
