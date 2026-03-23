FROM php:8.2-apache

# Enable Apache mod_rewrite (required for front controller)
RUN a2enmod rewrite

# System deps + rdkafka extension + cron
RUN apt-get update && apt-get install -y \
    librdkafka-dev libpq-dev curl zip unzip git cron \
    && pecl install rdkafka \
    && docker-php-ext-install pdo_pgsql pgsql \
    && docker-php-ext-enable rdkafka \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer


# Copy Apache vhost config
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf

# Set working directory
WORKDIR /var/www/html

# Copy app files
COPY . .

# Install PHP dependencies
RUN composer install --no-interaction --optimize-autoloader

# Setup entrypoint script
RUN chmod +x start.sh

EXPOSE 80

CMD ["./start.sh"]
