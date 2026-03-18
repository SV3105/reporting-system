FROM php:8.2-apache

# Enable Apache mod_rewrite (required for front controller)
RUN a2enmod rewrite

# System deps + rdkafka extension
RUN apt-get update && apt-get install -y \
    librdkafka-dev curl zip unzip git \
    && pecl install rdkafka \
    && docker-php-ext-enable rdkafka \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/local/bin --filename=composer

# Copy Apache vhost config
COPY 000-default.conf /etc/apache2/sites-available/000-default.conf

# Set working directory
WORKDIR /var/www/html

# Copy app files
COPY . .

# Install PHP dependencies
RUN composer install --no-interaction --optimize-autoloader

EXPOSE 80
