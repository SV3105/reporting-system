#!/bin/bash

# Setup crontab (including env vars for PHP scripts)
printenv | grep -E "DB_|SOLR_|SMTP_|VITE_|KAFKA_" | sed 's/^\([^=]*\)=\(.*\)$/\1="\2"/' > /etc/environment
echo "* * * * * /usr/local/bin/php /var/www/html/cron.php >> /var/log/cron.log 2>&1" > /etc/cron.d/report-cron
chmod 0644 /etc/cron.d/report-cron
crontab /etc/cron.d/report-cron
touch /var/log/cron.log

# Start cron and WebSocket server in background
cron
php /var/www/html/websocket.php >> /var/log/websocket.log 2>&1 &

# Start Apache in foreground
apache2-foreground
