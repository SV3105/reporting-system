#!/bin/bash

# Setup crontab (including env vars for PHP scripts)
printenv | grep -E "DB_|SOLR_|SMTP_|VITE_|KAFKA_" | sed 's/^\([^=]*\)=\(.*\)$/\1="\2"/' > /etc/environment
echo "* * * * * /usr/local/bin/php /var/www/html/cron.php >> /var/log/cron.log 2>&1" > /etc/cron.d/report-cron
chmod 0644 /etc/cron.d/report-cron
crontab /etc/cron.d/report-cron
touch /var/log/cron.log

# Start cron in background
cron

# Start Apache in foreground
apache2-foreground
