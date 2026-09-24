FROM nginx:alpine

COPY . /usr/share/nginx/html/

RUN sed -i 's/listen       80;/listen       10000;/' /etc/nginx/conf.d/default.conf

EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
