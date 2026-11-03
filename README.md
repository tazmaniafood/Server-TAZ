# Server-TAZ

Servidor de Tazmania: Ubuntu + Nginx + PostgreSQL + Node.js + Certbot.

## Estructura

```
server-taz/
├── backend/                         # API en Node.js (Express)
│   ├── src/
│   │   ├── index.js                 # Arranque del servidor
│   │   └── db/pool.js               # Pool de conexiones a PostgreSQL
│   ├── package.json
│   └── .env.example
├── database/
│   ├── crear_db.sql                 # Usuario y base de datos
│   ├── datos/
│   │   └── usuarios_iniciales.sql   # Usuario admin
│   ├── roles/
│   │   └── usuario_app.sql          # Usuario taz_app (permisos mínimos) para el backend
│   ├── schema/                      # Tablas (instalación nueva, en orden)
│   │   ├── 01_funciones.sql
│   │   ├── 02_usuarios.sql
│   │   └── 03_pedidos.sql
│   └── migraciones/                 # Cambios sobre una base ya creada
│       ├── 001_pedidos_numero_secuencial.sql
│       ├── 002_tipo_usuario_cocina.sql
│       └── 003_un_solo_usuario.sql
├── nginx/
│   ├── snippets/
│   │   ├── taz-ssl.conf             # Certificado y ajustes HTTPS
│   │   └── taz-api.conf             # /api/ -> backend (puerto 3000)
│   └── sites-available/
│       ├── taz-http.conf                     # HTTP -> HTTPS (siempre activo)
│       ├── taz-consumidor.conf               # tudominio.com       -> /var/www/consumidor
│       ├── taz-consumidor-mantenimiento.conf # tudominio.com       -> /var/www/mantenimiento
│       ├── taz-admin.conf                    # admin.tudominio.com -> /var/www/admin
│       └── taz-admin-mantenimiento.conf      # admin.tudominio.com -> /var/www/mantenimiento
├── scripts/
│   ├── instalar_servidor.sh
│   ├── crear_tablas.sh
│   └── backup.sh
└── README.md
```

## 1. Base de datos

Instalación nueva:

```bash
sudo -u postgres psql -v clave='TuClaveSegura' -f database/crear_db.sql
bash scripts/crear_tablas.sh
```

Usuario inicial (la clave se pasa al ejecutar, nunca se guardan en el repo;
el espacio al inicio evita que queden en el historial):

```bash
 psql -h localhost -U tazmania -d tazmania_db -v clave_admin='CLAVE' -f database/datos/usuarios_iniciales.sql
```

Volver a ejecutarlo con otra clave sirve para cambiarla.

Usuario de la app `taz_app` (el que usa el backend). Solo puede leer `usuarios`,
leer/crear `pedidos` y cambiar `pago_confirmado`; no puede borrar ni crear tablas:

```bash
 sudo -u postgres psql -d tazmania_db -v clave_app='CLAVE' -f database/roles/usuario_app.sql
```

Volver a ejecutarlo después de crear tablas nuevas o para cambiar la clave.

Si las tablas ya estaban creadas con la versión anterior (numero_pedido aleatorio):

```bash
psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/001_pedidos_numero_secuencial.sql
psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/002_tipo_usuario_cocina.sql
psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/003_un_solo_usuario.sql
```

## 2. Backend

```bash
cd backend
npm install --omit=dev
cp .env.example .env      # y poner la contraseña real
pm2 start npm --name taz-api -- start
pm2 save && pm2 startup
```

Comprobar: `curl http://127.0.0.1:3000/api/salud` -> `{"ok":true,"db":"conectada"}`

## 3. Nginx

Cambiar `tudominio.com` por el dominio real en todos los archivos:

```bash
sed -i 's/tudominio\.com/TU-DOMINIO.com/g' nginx/snippets/*.conf nginx/sites-available/*.conf
```

Carpetas de las páginas:

```bash
mkdir -p /var/www/consumidor /var/www/admin /var/www/mantenimiento
```

Certificado (uno para los tres nombres; los DNS ya deben apuntar al servidor):

```bash
certbot certonly --nginx -d TU-DOMINIO.com -d www.TU-DOMINIO.com -d admin.TU-DOMINIO.com
```

Copiar configuración y activar:

```bash
cp nginx/snippets/*.conf /etc/nginx/snippets/
cp nginx/sites-available/*.conf /etc/nginx/sites-available/
rm -f /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/taz-http.conf       /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/taz-consumidor.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/taz-admin.conf      /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 4. Modo mantenimiento

Cada sitio tiene su versión normal y su versión de mantenimiento. **Solo una de las
dos puede estar activa a la vez.** La página va en `/var/www/mantenimiento/index.html`
(sus css/imágenes en `/var/www/mantenimiento/recursos/`).

Activar mantenimiento en la tienda:

```bash
rm /etc/nginx/sites-enabled/taz-consumidor.conf
ln -s /etc/nginx/sites-available/taz-consumidor-mantenimiento.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Volver a normal:

```bash
rm /etc/nginx/sites-enabled/taz-consumidor-mantenimiento.conf
ln -s /etc/nginx/sites-available/taz-consumidor.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Para el admin es igual, con `taz-admin.conf` / `taz-admin-mantenimiento.conf`.

## Tablas

**usuarios**: `id_usuario` (aleatorio 6 dígitos), `usuario` (único), `contrasena_hash`,
`tipo_usuario` (admin | cocina | repartidor | cliente), `creado_en`.

**pedidos**: `numero_pedido` (secuencial 1, 2, 3...), `orden`, `nombre`, `celular`,
`monto_total`, `medio_pago`, `pago_confirmado`, `creado_en`.
