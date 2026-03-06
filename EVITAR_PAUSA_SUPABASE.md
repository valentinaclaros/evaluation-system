# Cómo evitar que Supabase pause tu proyecto

En el **plan gratuito**, Supabase **pausa** el proyecto después de **7 días sin actividad**.  
**Tus datos no se borran**: al reactivar el proyecto, todo sigue ahí.

---

## Opción 1: Abrir la página keep-alive cada 5–6 días

1. Sube `keep-alive.html` al mismo sitio donde está tu app (o ábrela localmente si usas un servidor local).
2. Cada **5 o 6 días** abre en el navegador la URL de esa página, por ejemplo:
   - `https://tu-dominio.com/keep-alive.html`
   - o `http://localhost:5500/keep-alive.html` (si usas Live Server).
3. Eso hace una consulta a Supabase y cuenta como actividad, así el proyecto no se pausa.

---

## Opción 2: Usar un cron gratuito (recomendado)

Un servicio externo puede abrir esa URL automáticamente cada pocos días:

- **[cron-job.org](https://cron-job.org)** (gratis): crea un cron que llame a la URL de `keep-alive.html` cada **5 días**.
- **[Uptime Robot](https://uptimerobot.com)** (gratis): monitorea una URL cada 5 minutos; eso también genera actividad si tu app hace peticiones a Supabase.

Pon como URL la dirección pública de `keep-alive.html` (ej. `https://tu-sitio.net/keep-alive.html`).

---

## Si el proyecto ya está pausado

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard).
2. Elige el proyecto; verás que está en pausa.
3. Pulsa **Restore project** / **Restaurar proyecto**.
4. Espera unos minutos a que se reactive. Después de eso, tu app volverá a conectar y los datos seguirán ahí.

---

## Si necesitas que nunca se pause

- Pasa al plan **Pro** de Supabase: los proyectos no se pausan por inactividad.
- O mantén el plan gratuito y usa la **Opción 1** u **Opción 2** de este documento.
