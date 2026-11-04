# Server-TAZ

Servidor de Tazmania: Ubuntu + Nginx + PostgreSQL + Node.js + Certbot.

## Estructura

```
server-taz/
├── backend/                         # API en Node.js (Express)
│   ├── src/
│   │   ├── index.js                 # Arranque del servidor
│   │   ├── config.js                # Lee el .env (Google Maps, Stripe, restaurante)
│   │   ├── validar.js               # Valida lo que manda la página
│   │   ├── db/pool.js               # Pool de conexiones a PostgreSQL
│   │   ├── middleware/limite.js     # Límite de peticiones por IP
│   │   ├── servicios/
│   │   │   ├── maps.js              # Google Routes API (millas manejando)
│   │   │   ├── delivery.js          # Millas -> costo según tarifas_delivery
│   │   │   ├── stripe.js            # Cobros con tarjeta
│   │   │   └── sesion.js            # Login del admin (cookie firmada)
│   │   └── rutas/
│   │       ├── publico.js           # GET  /api/config
│   │       ├── auth.js              # POST /api/login, /api/logout, GET /api/sesion
│   │       ├── menu.js              # GET/PUT /api/menu
│   │       ├── delivery.js          # POST /api/delivery/cotizar
│   │       ├── pedidos.js           # POST /api/pedidos
│   │       └── stripeWebhook.js     # POST /api/stripe/webhook
│   ├── package.json
│   └── .env.example
├── database/
│   ├── crear_db.sql                 # Usuario y base de datos
│   ├── datos/
│   │   ├── usuarios_iniciales.sql   # Usuario admin
│   │   ├── tarifas_delivery.sql     # Tramos de precio por millas
│   │   └── menu_inicial.sql         # Menú base (GENERADO desde Frontend-admin)
│   ├── roles/
│   │   └── usuario_app.sql          # Usuario taz_app (permisos mínimos) para el backend
│   ├── schema/                      # Tablas (instalación nueva, en orden)
│   │   ├── 01_funciones.sql
│   │   ├── 02_usuarios.sql
│   │   ├── 03_pedidos.sql
│   │   ├── 04_tarifas_delivery.sql
│   │   └── 05_menu.sql
│   └── migraciones/                 # Cambios sobre una base ya creada
│       ├── 001_pedidos_numero_secuencial.sql
│       ├── 002_tipo_usuario_cocina.sql
│       ├── 003_un_solo_usuario.sql
│       ├── 004_delivery_y_stripe.sql
│       └── 005_menu.sql
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
│   ├── generar_menu_inicial.js      # menu-base.js -> menu_inicial.sql
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

Tramos de delivery (editar los precios en el archivo antes de ejecutarlo;
volver a ejecutarlo reemplaza los tramos):

```bash
psql -h localhost -U tazmania -d tazmania_db -f database/datos/tarifas_delivery.sql
```

Menú (los datos salen de `Frontend-admin/JS/menu-base.js`):

```bash
psql -h localhost -U tazmania -d tazmania_db -f database/datos/menu_inicial.sql
```

Si se agregan o quitan platos en `menu-base.js`, regenerar el SQL y volver a cargarlo
(actualiza la base y borra lo que ya no existe, **sin perder los cambios hechos en el admin**):

```bash
node scripts/generar_menu_inicial.js ../Frontend-admin/JS/menu-base.js
```

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
psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/004_delivery_y_stripe.sql
psql -h localhost -U tazmania -d tazmania_db -f database/migraciones/005_menu.sql
```

Después de la 004: cargar `tarifas_delivery.sql`. Después de la 005: cargar `menu_inicial.sql`.
Al final, volver a ejecutar `usuario_app.sql` (permisos de las tablas nuevas).

## 2. Backend

```bash
cd backend
npm install --omit=dev
cp .env.example .env      # y poner la contraseña real
pm2 start npm --name taz-api -- start
pm2 save && pm2 startup
```

Comprobar: `curl http://127.0.0.1:3000/api/salud` -> `{"ok":true,"db":"conectada"}`

### Claves en el `.env`

| Variable | De dónde sale | ¿Secreta? |
|---|---|---|
| `RESTAURANTE_LAT` / `RESTAURANTE_LNG` | Google Maps: clic derecho en el restaurante | No |
| `GOOGLE_MAPS_SERVER_KEY` | Google Cloud. Solo **Routes API**, restringida a la IP del servidor | **Sí** |
| `GOOGLE_MAPS_BROWSER_KEY` | Google Cloud. **Maps JavaScript API** + **Places API (New)**, restringida a tu dominio | No |
| `STRIPE_SECRET_KEY` | Stripe -> Developers -> API keys (`sk_...`) | **Sí** |
| `STRIPE_PUBLISHABLE_KEY` | Stripe -> Developers -> API keys (`pk_...`) | No |
| `STRIPE_WEBHOOK_SECRET` | Stripe -> Developers -> Webhooks (`whsec_...`) | **Sí** |
| `SESSION_SECRET` | `openssl rand -hex 32` (firma la cookie de sesión del admin) | **Sí** |

Webhook de Stripe: crear el endpoint `https://TU-DOMINIO.com/api/stripe/webhook`
con los eventos `payment_intent.succeeded` y `payment_intent.payment_failed`.
Usar las claves de prueba (`sk_test_` / `pk_test_`) hasta que todo funcione.

Sin las claves de Google no se aceptan pedidos; sin las de Stripe solo se desactiva
el pago con tarjeta. Al arrancar, el log avisa qué falta.

### Endpoints para la página

El precio del delivery y el total **los calcula el servidor**: la página solo manda
la ubicación y el subtotal; lo que mande como delivery o total se ignora.

```js
// 1. Claves públicas (Google Maps del navegador y Stripe pk_)
const cfg = await (await fetch('/api/config')).json();
// -> { googleMapsKey, stripePublishableKey, restaurante: {lat, lng}, moneda }

// 2. Mostrar el costo cuando el cliente elige su dirección / mueve el pin
const r = await fetch('/api/delivery/cotizar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lat: 25.7791, lng: -80.1918 }),
});
// 200 -> { distancia_millas: 1.5, minutos: 15, costo_delivery: 3 }
// 422 -> { error: 'La dirección está fuera de la zona de entrega' }

// 3. Enviar el pedido
const p = await fetch('/api/pedidos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orden: '2 tacos al pastor, 1 horchata',
    nombre: 'Ana',
    celular: '305-555-1234',
    direccion: '123 Main St, Miami, FL',
    lat: 25.7791, lng: -80.1918,   // coordenadas finales del pin
    subtotal: 12.50,
    medio_pago: 'tarjeta',          // o 'efectivo', etc.
  }),
});
const pedido = await p.json();
// 201 -> { numero_pedido, subtotal, costo_delivery, monto_total, distancia_millas,
//          minutos, medio_pago, stripe_client_secret }

// 4. Solo si es tarjeta: completar el pago con Stripe.js (Payment Element)
//    usando pedido.stripe_client_secret. El pedido queda pago_confirmado = true
//    cuando Stripe avisa al webhook (no cuando la página dice que pagó).
```

### Endpoints del menú y del admin

| Método | Ruta | Quién | Para qué |
|---|---|---|---|
| GET | `/api/menu` | Público (tienda) | Menú actual: `{ items: { "<id>": { seccion, n, d, p, g, ing } }, actualizado }` |
| POST | `/api/login` | Admin | `{ usuario, clave }` -> pone la cookie de sesión (12 h) |
| GET | `/api/sesion` | Admin | ¿Sigo conectado? -> `{ usuario, tipo_usuario }` o 401 |
| POST | `/api/logout` | Admin | Cierra la sesión |
| GET | `/api/menu/cambios` | Admin | `{ cambios, actualizado }` (lo mismo que guarda `menu.js` en localStorage) |
| PUT | `/api/menu` | Admin | `{ cambios, actualizado }`: lo que ya manda `Frontend-admin/JS/menu.js` |

```js
// Admin: iniciar sesión (reemplaza el login provisional de auth.js)
const r = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({ usuario: 'admin', clave: '...' }),
});
// 200 -> { usuario, tipo_usuario }   401 -> { error }   429 -> demasiados intentos (5/min)

// Admin: al abrir la página Menú, traer lo guardado en el servidor
const { cambios, actualizado } = await (await fetch('/api/menu/cambios', { credentials: 'same-origin' })).json();

// Tienda: precios actuales
const { items } = await (await fetch('/api/menu')).json();
items['pizza-hawaiana'].p            // [13, 19, 24]  (Personal, Medium, Familiar)
items['topping-queso-extra@pizza'].p // precio del topping en pizza
```

`PUT /api/menu` reemplaza todos los cambios: un id que no viene vuelve al original.
Si llega un envío más viejo que el guardado (otro navegador que estaba sin internet), responde
`{ ok: true, aplicado: false }` y no pisa nada.

Errores: siempre `{ error: 'mensaje' }`. 400 = datos mal enviados, 422 = fuera de zona,
429 = demasiadas solicitudes, 503 = Google/Stripe no disponibles o sin configurar.

Límites por IP: 30 cotizaciones y 10 pedidos por minuto. La misma ubicación se guarda
30 minutos en memoria, así que cotizar y luego pedir = 1 sola consulta a Google.

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
`direccion`, `lat`, `lng`, `distancia_millas`, `subtotal`, `costo_delivery`,
`monto_total` (= subtotal + costo_delivery), `medio_pago`, `pago_confirmado`,
`stripe_payment_intent_id`, `creado_en`.

**menu**: `id` (el mismo de `menu-base.js`), `seccion`, `orden`, `base` (original),
`cambios` (lo editado en el admin), `actualizado_cliente`, `actualizado_en`.
Lo que ve la tienda = `base || cambios`.

**tarifas_delivery**: `millas_desde`, `millas_hasta`, `costo`, `activo`.
Aplica el tramo donde `millas_desde <= distancia < millas_hasta`; más allá del último = fuera de zona.
