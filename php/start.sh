#!/bin/bash

# Setup crontab (including env vars for PHP scripts)
printenv | grep -E "DB_|SOLR_|SMTP_|VITE_|KAFKA_" | sed 's/^\([^=]*\)=\(.*\)$/\1="\2"/' > /etc/environment
echo "* * * * * /usr/local/bin/php /var/www/html/cron.php >> /var/log/cron.log 2>&1" > /etc/cron.d/report-cron
chmod 0644 /etc/cron.d/report-cron
crontab /etc/cron.d/report-cron
touch /var/log/cron.log

# 1. Ensure DB and Solr are ready, then run migrations/init
echo "⏳ Waiting for databases to be ready..."
sleep 5 # Simple buffer for DB startup

php /var/www/html/init_db.php

# 2. Initialize Solr core if it doesn't exist
# We use curl to safely check if the core is already there
core_exists=$(curl -s "http://solr:8983/solr/admin/cores?action=STATUS&core=csvcore" | grep -c "csvcore")
if [ "$core_exists" -eq "0" ]; then
    echo "🔍 Creating Solr core: csvcore"
    curl -s "http://solr:8983/solr/admin/cores?action=CREATE&name=csvcore&instanceDir=csvcore&configSet=_default"
fi

# Start cron and WebSocket server in background
cron
php /var/www/html/websocket.php >> /var/log/websocket.log 2>&1 &

# Start Apache in foreground
apache2-foreground
