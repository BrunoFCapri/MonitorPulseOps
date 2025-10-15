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
    const data = await loadJSON();
    renderDisks(data.context || data);
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
})();
