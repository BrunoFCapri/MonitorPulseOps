import argparse
import os
import json
import platform
import socket
import time
from datetime import datetime

import psutil
import requests
from urllib.parse import urlparse, urlunparse, urlencode
"""
ERRROR CON EL TEMITA DEL TOKEN DESPUES LO OTRO PIOLA WACHO
"""

## mi token asiVu8jxp5J12TKquqktrQeql3jyb80KBmiGdAL93v9 para vercel
def bytes_to_human(n: float) -> str:
	symbols = ('B', 'KB', 'MB', 'GB', 'TB', 'PB')
	prefix = {}
	for i, s in enumerate(symbols[1:], 1):
		prefix[s] = 1 << (i * 10)
	for s in reversed(symbols[1:]):
		if n >= prefix[s]:
			value = float(n) / prefix[s]
			return f"{value:.2f} {s}"
	return f"{n:.0f} B"


def get_platform_info() -> dict:
	try:
		boot = datetime.fromtimestamp(psutil.boot_time()).isoformat()
	except Exception:
		boot = ''
	os_name = platform.system().lower()
	os_map = {
		'windows': 'windows',
		'linux': 'linux',
		'darwin': 'apple',
	}
	return {
		'node_name': socket.gethostname(),
		'os_name': os_map.get(os_name, 'unknown'),
		'system_name': platform.system(),
		'release_version': platform.release(),
		'architecture': platform.machine(),
		'processor_type': platform.processor(),
		'boot_time': boot,
	}


def get_memory_info() -> dict:
	vm = psutil.virtual_memory()
	sm = psutil.swap_memory()
	return {
		'svmem_total': bytes_to_human(vm.total),
		'svem_percent': round(vm.percent, 2),  # mantener nombre esperado por frontend (typo)
		'svmem_percent': round(vm.percent, 2),  # clave alternativa por si se corrige
		'smem_total': bytes_to_human(sm.total),
		'smem_percent': round(sm.percent, 2),
	}


def get_power_info() -> dict:
	try:
		batt = psutil.sensors_battery()
		if batt is None:
			return {
				'power_source': 'AC Power',
				'percent': None,
				'time_remaining': 'N/A',
			}
		secs = batt.secsleft if batt.secsleft and batt.secsleft > 0 else None
		if secs is not None:
			hrs = secs // 3600
			mins = (secs % 3600) // 60
			time_remaining = f"{hrs}h {mins}m"
		else:
			time_remaining = 'Calculating'
		return {
			'power_source': 'Battery Power' if not batt.power_plugged else 'AC Power',
			'percent': round(batt.percent, 1) if batt.percent is not None else None,
			'time_remaining': time_remaining,
		}
	except Exception:
		return {
			'power_source': 'Unknown',
			'percent': None,
			'time_remaining': 'N/A',
		}


def get_users_info() -> dict:
	users = {}
	try:
		for idx, u in enumerate(psutil.users(), start=1):
			started = datetime.fromtimestamp(u.started).isoformat() if u.started else ''
			users[str(idx)] = {
				'name': u.name,
				'terminal': getattr(u, 'terminal', ''),
				'host': getattr(u, 'host', ''),
				'pid': getattr(u, 'pid', ''),
				'started_str': started,
			}
	except Exception:
		pass
	return users


def get_disks_info() -> dict:
	disks = {}
	try:
		for p in psutil.disk_partitions(all=False):
			try:
				usage = psutil.disk_usage(p.mountpoint)
				disks[p.device] = {
					'device': p.device,
					'mounted': p.mountpoint,
					'total': bytes_to_human(usage.total),
					'used': bytes_to_human(usage.used),
					'free': bytes_to_human(usage.free),
				}
			except Exception:
				# Algunos mountpoints pueden no ser accesibles
				continue
	except Exception:
		pass
	return disks


def get_network_info() -> dict:
	info = {}
	try:
		addrs = psutil.net_if_addrs()
		io = psutil.net_io_counters(pernic=True)
		for name, addr_list in addrs.items():
			ip = ''
			for a in addr_list:
				if getattr(a, 'family', None) == getattr(socket, 'AF_INET', None):
					ip = a.address
					break
			totals = io.get(name)
			info[name] = {
				'name': name,
				'ip_address': ip,
				'sent_bytes': bytes_to_human(getattr(totals, 'bytes_sent', 0) if totals else 0),
				'received_bytes': bytes_to_human(getattr(totals, 'bytes_recv', 0) if totals else 0),
			}
	except Exception:
		pass
	return info


def build_payload() -> dict:
	return {
		'context': {
			'platform_info': get_platform_info(),
			'memory_info': get_memory_info(),
			'power_info': get_power_info(),
			'user_info': get_users_info(),
			'disk_info': get_disks_info(),
			'network_info': get_network_info(),
		}
	}


def ensure_bypass_session(endpoint: str, bypass_token: str) -> requests.Session:
	"""Crea una sesión y establece la cookie de bypass en el dominio del endpoint."""
	sess = requests.Session()
	parsed = urlparse(endpoint)
	root = parsed._replace(path='/', query='', params='', fragment='')
	root_url = urlunparse(root)
	# Intentar setear cookie con GET (root y path del endpoint)
	params = {
		'x-vercel-set-bypass-cookie': 'true',
		'x-vercel-protection-bypass': bypass_token,
	}
	headers = {
		'x-vercel-protection-bypass': bypass_token,
		'User-Agent': 'MonitorPulseOps/1.0'
	}
	try:
		# Root
		sess.get(root_url, params=params, headers=headers, timeout=10, allow_redirects=True)
		# Mismo path del endpoint
		sess.get(endpoint, params=params, headers=headers, timeout=10, allow_redirects=True)
	except Exception:
		pass
	return sess


def send_payload(endpoint: str, payload: dict, token: str | None = None, timeout: int = 10, bypass_token: str | None = None, session: requests.Session | None = None) -> tuple[bool, str]:
	headers = {'Content-Type': 'application/json'}
	if token:
		headers['Authorization'] = f'Bearer {token}'
	# Usar header y cookie (sesión) para mayor compatibilidad con Vercel Protection
	if bypass_token:
		headers['x-vercel-protection-bypass'] = bypass_token
		if session is None:
			session = ensure_bypass_session(endpoint, bypass_token)
		# Añadir parámetros de bypass también en la URL del POST
		try:
			parsed = urlparse(endpoint)
			q = dict([kv.split('=') if '=' in kv else (kv, '') for kv in parsed.query.split('&') if parsed.query])
		except Exception:
			q = {}
		q['x-vercel-set-bypass-cookie'] = 'true'
		q['x-vercel-protection-bypass'] = bypass_token
		endpoint = urlunparse(parsed._replace(query=urlencode(q)))
	try:
		client = session or requests
	r = client.post(endpoint, headers=headers, json=payload, timeout=timeout)
		if r.ok:
			return True, f"POST {endpoint} -> {r.status_code}"
		return False, f"POST {endpoint} -> {r.status_code}: {r.text[:200]}"
	except Exception as e:
		return False, f"POST error: {e}"


def run_loop(endpoint: str, interval: float = 5.0, count: int = 0, token: str | None = None, bypass_token: str | None = None):
	i = 0
	sess = None
	if bypass_token:
		sess = ensure_bypass_session(endpoint, bypass_token)
	while True:
		payload = build_payload()
		ok, msg = send_payload(endpoint, payload, token=token, bypass_token=bypass_token, session=sess)
		i += 1
		now = time.strftime('%Y-%m-%d %H:%M:%S')
		print(f"[{now}] iter={i} send={ok} {msg}")
		if count and i >= count:
			break
		time.sleep(interval)


def main():
	parser = argparse.ArgumentParser(description='Enviar métricas a Vercel para Web Dashboard')
	parser.add_argument('--endpoint', default=os.getenv('METRICS_ENDPOINT', 'https://monitor-pulse-oa93j1a4g-brunofcapris-projects.vercel.app/api/metrics'), help='Endpoint HTTP que recibe el JSON (POST)')
	parser.add_argument('--interval', type=float, default=5.0, help='Segundos entre envíos')
	parser.add_argument('--count', type=int, default=0, help='Número de iteraciones (0 = infinito)')
	parser.add_argument('--token', default=None, help='Bearer token si el endpoint requiere autenticación')
	parser.add_argument('--bypass-token', dest='bypass_token', default=None, help='Vercel Protection Bypass token (header x-vercel-protection-bypass)')
	args = parser.parse_args()

	# Fallback a variables de entorno si no se pasan por CLI
	bypass_token = args.bypass_token or os.getenv('VERCEL_BYPASS_TOKEN') or os.getenv('BYPASS_TOKEN')
	endpoint = args.endpoint or os.getenv('METRICS_ENDPOINT')

	run_loop(endpoint=endpoint, interval=args.interval, count=args.count, token=args.token, bypass_token=bypass_token)


if __name__ == '__main__':
	main()





