# Server-TAZ

Configuración del servidor (Ubuntu + Nginx + PostgreSQL + Node.js + Certbot).

## Estructura

```
server-taz/
├── database/
│   ├── crear_db.sql          # Crea usuario y base de datos
│   └── schema/               # Tablas (se ejecutan en orden)
│       ├── 01_funciones.sql  # generar_id_unico()
│       ├── 02_usuarios.sql
│       └── 03_pedidos.sql
├── nginx/
│   └── tazmania.conf         # HTTP -> HTTPS + proxy al backend
├── scripts/
│   ├── instalar_servidor.sh  # Instala todo + firewall
│   ├── crear_tablas.sh       # Ejecuta database/schema/*.sql
│   └── backup.sh             # Copia de seguridad
├── .env.example
└── README.md
```

## Pasos en un servidor nuevo

```bash
sudo bash scripts/instalar_servidor.sh
sudo -u postgres psql -v clave='TuClaveSegura' -f database/crear_db.sql
bash scripts/crear_tablas.sh
```

## Tablas

**usuarios**: `id_usuario` (aleatorio 6 dígitos), `usuario` (único), `contrasena_hash`,
`tipo_usuario` (admin | cliente | repartidor), `creado_en`.

**pedidos**: `numero_pedido` (aleatorio 8 dígitos), `orden`, `nombre`, `celular`,
`monto_total`, `medio_pago` (efectivo | tarjeta | transferencia | nequi | daviplata),
`pago_confirmado`, `creado_en`.
