# Coletor Python. Não altera o código do bot — só empacota o CLI.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
RUN pip install --no-cache-dir "httpx>=0.27" "selectolax>=0.3.21" "psycopg[binary]>=3.1"
COPY services/collector/captacao_bot ./captacao_bot
COPY deploy/collector-loop.sh /usr/local/bin/collector-loop
COPY deploy/collector-health.sh /usr/local/bin/collector-health
RUN chmod +x /usr/local/bin/collector-loop /usr/local/bin/collector-health
CMD ["collector-loop"]
