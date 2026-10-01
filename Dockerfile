FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY pages /usr/share/nginx/html/pages
COPY seller /usr/share/nginx/html/seller

RUN sed -i 's/listen       80;/listen       10000;/' /etc/nginx/conf.d/default.conf

EXPOSE 10000
