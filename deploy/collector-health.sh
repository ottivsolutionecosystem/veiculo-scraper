#!/bin/sh
# Healthcheck: o loop marcou pulso nos últimos 2 minutos.
python3 -c "import os,sys,time; p=os.environ.get('COLLECTOR_HEARTBEAT','/tmp/collector-ok'); sys.exit(0 if os.path.exists(p) and time.time()-os.path.getmtime(p)<120 else 1)"
