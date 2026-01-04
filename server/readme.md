  GNU nano 6.2                              hireportalWithCicd
server {
    server_name employee.slogsolutions.com;

    root /var/www/hireportal;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase upload limit if needed
    client_max_body_size 50M;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/employee.slogsolutions.com/fullchain.pem; # managed by Cert>
    ssl_certificate_key /etc/letsencrypt/live/employee.slogsolutions.com/privkey.pem; # managed by Ce>
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = employee.slogsolutions.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name employee.slogsolutions.com;
    return 404; # managed by Certbot


}