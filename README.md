# Sistema de auditorías

Sistema web para gestionar auditorías de llamadas, feedbacks y agentes (Teleperformance / Konecta). Datos en **Supabase**.

## Cómo usar

1. Configura `supabase-config.js` con tu URL y clave de Supabase.
2. Abre `index.html` en el navegador (o sirve la carpeta con un servidor local).

## Estructura

- **Dashboard** (`index.html`): barra lateral, barra superior, sección Agents (burbujas por BPO).
- **Auditorías** → detalle y listado.
- **Feedbacks** → detalle y listado.
- **MAIN**: Dashboard, Schedule (calendario), Metrics, Agent reports.
- **RECORDS**: Team (Top Offenders).
- **Settings** → gestión de agentes.
- **Registrar auditoría** / **Registrar feedback** desde las páginas de detalle.

## SQL (Supabase)

- `BORRAR_TODOS_LOS_DATOS.sql`: vacía auditorías, agentes, feedbacks y strikes.
- `HABILITAR_RLS_AGENTES_Y_DATOS.sql`: políticas RLS para que la app pueda leer/escribir.
