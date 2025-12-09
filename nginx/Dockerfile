FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

# ssl disabled as subject only mention https must be used everywhere in backend only. uncomment it if requires.
# RUN mkdir -p /etc/nginx/ssl

# Copy SSL certificates
# COPY ssl/cert.pem /etc/nginx/ssl/cert.pem
# COPY ssl/key.pem /etc/nginx/ssl/key.pem

# RUN chmod 600 /etc/nginx/ssl/key.pem

# EXPOSE 80 443
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
