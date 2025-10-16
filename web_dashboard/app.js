// Config: define DATA_URL en config.js o usa data.json local
function getQuery(param) {
  const url = new URL(window.location.href);
  return url.searchParams.get(param);
}

function withDevice(url, deviceId) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (deviceId) u.searchParams.set('device', deviceId);
    return u.toString();
  } catch {
    // relative path like ./data.json
    const base = new URL(window.location.origin + (url.startsWith('/') ? url : ('/' + url.replace(/^\.\//, ''))));
    if (deviceId) base.searchParams.set('device', deviceId);
    return base.toString();
  }
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar datos');
  return await res.json();
}

async function loadData(deviceId) {
  let base = (typeof DATA_URL !== 'undefined' && DATA_URL) ? DATA_URL : './data.json';
  const url = withDevice(base, deviceId);
  const data = await fetchJSON(url);
  // Si el endpoint retorna lista de dispositivos, elegir uno
  if (data && data.devices && Array.isArray(data.devices)) {
    return { devices: data.devices };
  }
  return data;
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

  // CPU total (overview)
  const cpuTotal = context.cpu_total_percent;
  if (typeof cpuTotal !== 'undefined' && cpuTotal !== null) {
    setText('cpu_total_percent', Number(cpuTotal).toFixed(1) + '%');
  }

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
  // Crear UI para selector de dispositivo si hay múltiples
  const header = document.querySelector('header .text-center');
  let deviceSelect = null;
  if (header) {
    deviceSelect = document.createElement('select');
    deviceSelect.id = 'deviceSelect';
    deviceSelect.className = 'form-select form-select-sm bg-dark text-white';
    deviceSelect.style.maxWidth = '240px';
    deviceSelect.style.marginLeft = '8px';
    const wrapper = document.createElement('div');
    wrapper.className = 'd-flex justify-content-center align-items-center gap-2';
    const title = header.querySelector('h3');
    const platformLine = header.querySelector('#platform-line');
    if (title) {
      header.innerHTML = '';
      const left = document.createElement('div');
      left.className = 'd-flex flex-column align-items-center';
      left.appendChild(title);
      if (platformLine) {
        // ensure we keep the same element (and id)
        left.appendChild(platformLine);
      }
      wrapper.appendChild(left);
      wrapper.appendChild(deviceSelect);
      header.appendChild(wrapper);
    }
  }

  async function tick() {
    try {
      const chosen = getQuery('device') || (typeof DEFAULT_DEVICE_ID !== 'undefined' ? DEFAULT_DEVICE_ID : undefined);
      // Propagar el device a los enlaces internos
      if (chosen) {
        document.querySelectorAll('a[href$=".html"]').forEach(a => {
          try {
            const u = new URL(a.getAttribute('href'), window.location.origin);
            u.searchParams.set('device', chosen);
            a.setAttribute('href', u.pathname + u.search);
          } catch {}
        });
      }
      const data = await loadData(chosen);
      if (data && data.devices && Array.isArray(data.devices)) {
        // poblar selector y esperar a que el usuario elija
        if (deviceSelect) {
          deviceSelect.innerHTML = '';
          // opción vacía si no hay selección
          const opt0 = document.createElement('option');
          opt0.value = '';
          opt0.textContent = 'Elegir dispositivo…';
          deviceSelect.appendChild(opt0);
          data.devices.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.id} (${d.os})`;
            deviceSelect.appendChild(opt);
          });
          deviceSelect.onchange = () => {
            const id = deviceSelect.value;
            if (!id) return;
            const u = new URL(window.location.href);
            u.searchParams.set('device', id);
            window.location.href = u.toString();
          };
        }
        return; // no render aún
      }
      render(data.context || data);
    } catch (e) {
      console.error('Refresh error:', e);
    }
  }

  // Primera carga
  await tick();
  // Refresco periódico cada 3s para mantener CPU al día
  setInterval(tick, 3000);
})();
