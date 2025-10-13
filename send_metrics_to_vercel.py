#!/usr/bin/env python3
"""
send_metrics_to_vercel.py
Recolecta métricas con psutil y envía por POST a la URL que proveas (Vercel).
Uso:
  python send_metrics_to_vercel.py --url "https://mi-dashboard.vercel.app/api/metrics" --interval 5
Opciones:
  --api-key <KEY>     : si el endpoint requiere una clave, se envía en header X-API-KEY
  --once              : enviar solo una vez y salir
"""

import argparse
import time
import socket
import json
import sys

try:
    import requests
except Exception:
    requests = None

try:
    import psutil
except Exception:
    psutil = None


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def collect():
    if not psutil:
        return {"error": "psutil no instalado"}
    cpu = psutil.cpu_percent(interval=1)
    ram = psutil.virtual_memory().percent
    cpu_temp = "N/A"
    try:
        if hasattr(psutil, "sensors_temperatures"):
            st = psutil.sensors_temperatures() or {}
            cpu_temp = next((t.current for v in st.values() for t in v if hasattr(t, "current")), "N/A")
    except Exception:
        pass
    return {
        "hostname": socket.gethostname(),
        "ip": get_local_ip(),
        "timestamp": int(time.time()),
        "cpu_percent": cpu,
        "ram_percent": ram,
        "cpu_temperature": cpu_temp
    }


def send(url, payload, api_key=None, timeout=6):
    if not requests:
        print("Instala requests: pip install requests")
        return False, "no-requests"
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["X-API-KEY"] = api_key
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=timeout)
        r.raise_for_status()
        return True, r.text
    except Exception as e:
        return False, str(e)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--url", required=True, help="URL del endpoint (ej: https://mi-dashboard.vercel.app/api/metrics)")
    p.add_argument("--api-key", default=None, help="API key para el header X-API-KEY (opcional)")
    p.add_argument("--interval", type=float, default=5.0, help="Segundos entre envíos")
    p.add_argument("--once", action="store_true", help="Enviar una vez y salir")
    args = p.parse_args()

    print("Enviando a:", args.url)
    try:
        while True:
            payload = collect()
            ok, info = send(args.url, payload, api_key=args.api_key)
            ts = time.strftime("%Y-%m-%d %H:%M:%S")
            print(f"{ts} -> {'OK' if ok else 'FAIL'} {info} {payload}")
            if args.once:
                break
            time.sleep(max(0.1, args.interval))
    except KeyboardInterrupt:
        print("\nInterrumpido por usuario")

if __name__ == "__main__":
    main()
