FROM httpd:2.4

# Dezactivează MPM-urile implicite
RUN sed -i 's/^LoadModule mpm_event_module/#LoadModule mpm_event_module/' /usr/local/apache2/conf/httpd.conf && \
    sed -i 's/^LoadModule mpm_worker_module/#LoadModule mpm_worker_module/' /usr/local/apache2/conf/httpd.conf

# Activează modulele necesare
RUN echo "LoadModule mpm_prefork_module modules/mod_mpm_prefork.so" >> /usr/local/apache2/conf/httpd.conf && \
    echo "LoadModule proxy_module modules/mod_proxy.so" >> /usr/local/apache2/conf/httpd.conf && \
    echo "LoadModule proxy_http_module modules/mod_proxy_http.so" >> /usr/local/apache2/conf/httpd.conf && \
    echo "LoadModule log_config_module modules/mod_log_config.so" >> /usr/local/apache2/conf/httpd.conf && \
    echo "ServerName localhost" >> /usr/local/apache2/conf/httpd.conf && \
    echo "Listen 5000" >> /usr/local/apache2/conf/httpd.conf && \
    echo "Include conf/extra/ai-vhost.conf" >> /usr/local/apache2/conf/httpd.conf

COPY ai-vhost.conf /usr/local/apache2/conf/extra/