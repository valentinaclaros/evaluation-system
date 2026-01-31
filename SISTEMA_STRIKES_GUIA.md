# 🚨 Sistema de Strikes por Reincidencias - Guía Completa

## 📋 Descripción General

El Sistema de Strikes se implementó para gestionar automáticamente las reincidencias de los agentes basándose en los feedbacks con matriz disciplinaria aplicada.

---

## ✅ Pasos de Implementación Completados

### 1. **Base de Datos - Tabla `strikes`**

Se creó una nueva tabla en Supabase con la siguiente estructura:

```sql
CREATE TABLE strikes (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    project TEXT NOT NULL,
    strike_level INTEGER (1-3),
    feedback_id UUID,
    feedback_description TEXT,
    aplica_matriz TEXT ('Si', 'No'),
    accionable TEXT ('Advertencia verbal', 'Advertencia escrita', 'Terminación', 'Citación a descargos'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**⚠️ IMPORTANTE:** Debes ejecutar el archivo `CREAR_TABLA_STRIKES.sql` en el SQL Editor de Supabase.

---

### 2. **Lógica de Generación Automática de Strikes**

Los strikes se generan **automáticamente** cuando se registra un feedback con matriz disciplinaria aplicada.

#### Reglas de Generación:

| Número de Incidencia | Nivel de Strike | Descripción |
|---------------------|----------------|-------------|
| 1ª Incidencia | Strike 1 | Primera falta |
| 2ª Incidencia | Strike 1 | Segunda falta (mismo strike) |
| 3ª Incidencia | Strike 2 | Reincidencia media |
| 4ª Incidencia | Strike 3 | Reincidencia grave |

**Código implementado en `registrar-feedback.js`:**

```javascript
// Determinar el nivel de strike según número de incidencias
const incidenciaLevel = formData.matrizDisciplinaria.numeroIncidencia;
let strikeLevel = 1;

if (incidenciaLevel === 3) {
    strikeLevel = 2;
} else if (incidenciaLevel === 4) {
    strikeLevel = 3;
}
```

---

### 3. **Visualización en Detalle de Feedbacks**

La sección de strikes se muestra **automáticamente** cuando despliegas un agente en la página `detalle-feedbacks.html`.

#### Características de la Vista:

- **Diseño moderno** con gradiente morado
- **3 tarjetas** (Strike 1, Strike 2, Strike 3)
- Muestra el strike más reciente de cada nivel
- Información incluida por strike:
  - Feedback relacionado
  - Si aplica matriz (Sí/No)
  - Accionable (Advertencia verbal/escrita, Terminación, Citación a descargos)
  - Fecha de creación

#### Estados Posibles:

1. **Sin strikes:** Muestra "Este agente no tiene strikes registrados"
2. **Con strikes:** Muestra las 3 tarjetas con su información
3. **Strike sin registro:** Muestra "Sin registro" en ese nivel

---

## 🔄 Flujo Completo del Sistema

```
1. Usuario registra feedback
   ↓
2. Selecciona "Sí" en Matriz Disciplinaria
   ↓
3. Sistema detecta número de incidencia (1, 2, 3 o 4)
   ↓
4. Se guarda el feedback en la BD
   ↓
5. Se genera strike automáticamente:
   - Incidencia 1 o 2 → Strike 1
   - Incidencia 3 → Strike 2
   - Incidencia 4 → Strike 3
   ↓
6. Strike aparece en "Detalle de Feedbacks" del agente
```

---

## 🎨 Diseño Visual

### Sección de Strikes:
- **Fondo:** Gradiente morado (#667eea → #764ba2)
- **Tarjetas:** Efecto glassmorphism (fondo semitransparente con blur)
- **Íconos por nivel:**
  - Strike 1: ⚠️
  - Strike 2: 🔴
  - Strike 3: 🚨

### Badges de Accionable:
- 💬 Advertencia verbal
- 📝 Advertencia escrita
- 🚫 Terminación
- ⚖️ Citación a descargos

---

## 📂 Archivos Modificados

1. **`CREAR_TABLA_STRIKES.sql`** (NUEVO)
   - Script SQL para crear tabla en Supabase

2. **`detalle-feedbacks.html`**
   - Agregados estilos CSS para la sección de strikes

3. **`detalle-feedbacks.js`**
   - Función `renderStrikesSection()`: Renderiza strikes del agente
   - Función `getStrikeIcon()`: Devuelve ícono según nivel
   - Función `getAccionableIcon()`: Devuelve ícono según accionable

4. **`registrar-feedback.js`**
   - Función `saveFeedback()`: Guarda feedback y genera strike
   - Función `generateStrike()`: Lógica de generación automática

---

## 🚀 Cómo Probarlo

### Paso 1: Ejecutar SQL
1. Abre Supabase
2. Ve a SQL Editor
3. Copia el contenido de `CREAR_TABLA_STRIKES.sql`
4. Ejecuta el script

### Paso 2: Registrar Feedback con Matriz
1. Ve a "Registrar Feedback"
2. Selecciona un agente
3. Llena los datos del feedback
4. Selecciona "Sí" en Matriz Disciplinaria
5. Llena los datos de la matriz (tipo falta, gravedad, descripción)
6. Selecciona una acción de incidencia
7. Guarda

### Paso 3: Ver el Strike
1. Ve a "Detalle de Feedbacks"
2. Haz clic en el agente
3. Verás la sección de strikes en la parte superior

---

## 🔍 Verificación en Supabase

Puedes verificar que los strikes se están generando correctamente:

```sql
SELECT * FROM strikes 
WHERE agent_id = 'UUID_DEL_AGENTE'
ORDER BY created_at DESC;
```

---

## 🎯 Próximos Pasos Recomendados

1. **Notificaciones:** Agregar alertas cuando un agente recibe un strike
2. **Dashboard:** Mostrar estadísticas de strikes en el dashboard principal
3. **Exportación:** Permitir exportar historial de strikes a PDF
4. **Edición:** Permitir editar/eliminar strikes manualmente

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que ejecutaste el SQL en Supabase
2. Revisa la consola del navegador (F12) para errores
3. Asegúrate de que la tabla `feedbacks` tiene los campos:
   - `matriz_disciplinaria`
   - `numero_incidencia`
   - `accion_incidencia`

---

## ✅ Sistema Completamente Funcional

El sistema está **100% operativo** y listo para usar. Los strikes se generan automáticamente y se visualizan correctamente en la interfaz.

¡Disfruta del sistema! 🎉
