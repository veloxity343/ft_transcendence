FROM debian:bookworm-slim

# Install nginx + required tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# SSL directory
RUN mkdir -p /etc/nginx/ssl

# Copy SSL certificates
COPY ssl/cert.pem /etc/nginx/ssl/cert.pem
COPY ssl/key.pem /etc/nginx/ssl/key.pem

# Secure private key
RUN chmod 600 /etc/nginx/ssl/key.pem

# Expose HTTP + HTTPS ports
EXPOSE 80 443

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
