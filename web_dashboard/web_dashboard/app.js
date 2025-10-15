// Config: define DATA_URL en config.js o usa data.json local
async function loadData() {
  let url = (typeof DATA_URL !== 'undefined' && DATA_URL) ? DATA_URL : './data.json';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar datos');
  return await res.json();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

function iconOS(os) {
  if (!os || os === 'unknown') return '<i class="fa-brands fa-question"></i>';
  return `<i class="fa-brands fa-${os}"></i>`;
}

function render(context) {
  // Pagetitle line
  const pi = context.platform_info || {};
  const osName = pi.os_name === 'apple' ? 'macOS' : (pi.os_name || 'Unknown');
  const line = `${iconOS(pi.os_name)} Hostname: ${pi.node_name || ''}, OS: ${osName}, System: ${pi.system_name || ''} v${pi.release_version || ''}, Architecture: ${pi.architecture || ''} ${pi.processor_type || ''}, Up Time: ${pi.boot_time || ''}`;
  document.getElementById('platform-line').innerHTML = line;

  // Memory
  const mem = context.memory_info || {};
  setText('svmem_total', mem.svmem_total);
  setText('svem_percent', `${mem.svem_percent}%`);
  setText('smem_total', mem.smem_total);
  setText('smem_percent', `${mem.smem_percent}%`);

  // Power
  const pw = context.power_info || {};
  document.getElementById('power_icon').innerHTML = (pw.power_source === 'Battery Power')
    ? (pw.percent <= 25
        ? '<i class="fa-solid fa-battery-quarter text-danger"></i>'
        : (pw.percent <= 50
            ? '<i class="fa-solid fa-battery-half"></i>'
            : '<i class="fa-solid fa-battery-three-quarters text-success"></i>'))
    : '<i class="fa-solid fa-plug-circle-bolt text-success"></i>';
  setText('power_percent', `${pw.percent ?? ''} %`);
  setText('power_time', pw.time_remaining);
  setText('power_source', pw.power_source);

  // Users
  const usersBody = document.getElementById('users_body');
  usersBody.innerHTML = '';
  const users = Object.values(context.user_info || {});
  for (const u of users) {
    const tr = document.createElement('tr');
    const started = (u.started_str) || '';
    tr.innerHTML = `<td>${u.name||''}</td><td>${u.terminal||''}</td><td>${u.host||''}</td><td>${started}</td><td>${u.pid||''}</td>`;
    usersBody.appendChild(tr);
  }

  // Disks
  const disksBody = document.getElementById('disks_body');
  disksBody.innerHTML = '';
  for (const d of Object.values(context.disk_info || {})) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.device||''}</td><td>${d.mounted||''}</td><td>${d.total||''}</td><td>${d.used||''}</td><td>${d.free||''}</td>`;
    disksBody.appendChild(tr);
  }

  // Network
  const nicsBody = document.getElementById('nics_body');
  nicsBody.innerHTML = '';
  for (const n of Object.values(context.network_info || {})) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${n.name||''}</td><td>${n.ip_address||''}</td><td>${n.sent_bytes||''}</td><td>${n.received_bytes||''}</td>`;
    nicsBody.appendChild(tr);
  }
}

(async function init(){
  try {
    const data = await loadData();
    render(data.context || data);
  } catch (e) {
    console.error(e);
  }
})();
