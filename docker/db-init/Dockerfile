FROM mcr.microsoft.com/mssql/server:2022-latest

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends apache2-utils \
    && rm -rf /var/lib/apt/lists/*

COPY init-sql /scripts

RUN chmod +x /scripts/init-db.sh

ENTRYPOINT ["/bin/bash", "/scripts/init-db.sh"]
