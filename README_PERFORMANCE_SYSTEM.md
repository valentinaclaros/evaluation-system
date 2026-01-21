# Sistema de Evaluación del Desempeño Automatizado

Sistema completo para auditar llamadas de cancelaciones de tarjetas de crédito y cuentas de ahorro, registrar feedback a agentes y analizar la mejora en su desempeño.

## 🎯 Características Principales

### 1. **Gestión de Metas y OKRs**
- Crea y asigna metas de forma masiva
- Gestiona y da seguimiento del progreso y cumplimiento
- Notifica o envía mensajes
- Gestiona permisos para asignar o editar

### 2. **Auditorías de Llamadas**
- Registra auditorías con:
  - Fecha de la llamada
  - Customer ID
  - Agente que atendió
  - Auditor que revisó
  - Tipo de error encontrado
  - Nivel de criticidad (baja, media, alta, crítica)
  - Calificación TNPS (promoter, neutral, detractor, null)
  - Notas adicionales

### 3. **Gestión de Feedback**
- Registra feedback estructurado a agentes
- Define planes de acción
- Análisis automático de impacto pre/post feedback
- Compara errores antes y después del feedback

### 4. **Análisis y Reportes**
- Dashboard con métricas generales
- Vista de desempeño por agente
- Ranking de agentes por menor tasa de error
- Distribución de TNPS
- Análisis de errores por tipo
- Tendencias de mejora

### 5. **Plan Individual de Desarrollo**
- Visualiza el progreso de cada agente
- Identifica brechas de desempeño
- Cierra brechas identificadas en las evaluaciones

## 📋 Requisitos

- Python 3.8+
- pip (gestor de paquetes de Python)

## 🚀 Instalación y Uso

### 1. Instalar dependencias

```bash
cd /Users/valentina.claros/Desktop/Query
pip install -r requirements.txt
```

### 2. Inicializar base de datos con datos de ejemplo (opcional)

```bash
python init_sample_data.py
```

Este script creará:
- 5 agentes de ejemplo
- 2 auditores
- 50 auditorías de llamadas con datos variados
- 10 feedbacks con análisis de impacto

### 3. Iniciar el servidor

```bash
python main.py
```

El servidor se iniciará en: **http://localhost:8000**

### 4. Acceder al sistema

Abre tu navegador y visita: **http://localhost:8000**

## 📊 Uso del Sistema

### Dashboard
Al iniciar, verás:
- Total de agentes activos
- Total de auditorías realizadas
- Total de feedbacks entregados
- Errores críticos
- Tasa de error promedio
- Distribución de TNPS
- Top 10 agentes con menor tasa de error

### Gestión de Agentes
1. Click en "Agentes" en el menú lateral
2. Click en "Nuevo Agente" para agregar
3. Completa: nombre, email, departamento, cargo
4. Guarda y el agente estará disponible para auditorías

### Registrar Auditorías de Llamadas
1. Click en "Auditorías"
2. Click en "Nueva Auditoría"
3. Completa el formulario:
   - Fecha y hora de la llamada
   - Customer ID
   - Tipo de llamada (tarjeta de crédito o cuenta de ahorros)
   - Agente que atendió
   - Auditor que revisó
   - Nivel de criticidad
   - Tipo y descripción del error (si aplica)
   - Calificación TNPS del cliente
   - Notas adicionales
4. Guarda la auditoría

### Entregar Feedback a Agentes
1. Click en "Feedbacks"
2. Click en "Nuevo Feedback"
3. Selecciona el agente
4. Ingresa fecha, título y descripción del feedback
5. Define un plan de acción (opcional)
6. Guarda el feedback

### Analizar Impacto del Feedback
1. En la sección de "Feedbacks"
2. Click en "Analizar" en el feedback deseado
3. El sistema automáticamente:
   - Cuenta errores 30 días antes del feedback
   - Cuenta errores 30 días después del feedback
   - Calcula el porcentaje de mejora
   - Muestra si el agente mejoró o empeoró

### Ver Análisis de Desempeño por Agente
1. Click en "Análisis"
2. Selecciona un agente del dropdown
3. Visualiza:
   - Total de llamadas atendidas
   - Total de errores cometidos
   - Tasa de error
   - Score TNPS
   - Distribución de TNPS (promotores, neutrales, detractores)
   - Errores por tipo
   - Historial de feedbacks con análisis de mejora

## 🔧 API Endpoints

### Agentes
- `POST /api/agents/` - Crear agente
- `GET /api/agents/` - Listar agentes
- `GET /api/agents/{id}` - Obtener agente específico
- `PUT /api/agents/{id}/deactivate` - Desactivar agente

### Auditores
- `POST /api/auditors/` - Crear auditor
- `GET /api/auditors/` - Listar auditores

### Auditorías
- `POST /api/audits/` - Crear auditoría
- `GET /api/audits/` - Listar auditorías (con filtros)
- `GET /api/audits/{id}` - Obtener auditoría específica

Filtros disponibles:
- `agent_id` - Filtrar por agente
- `auditor_id` - Filtrar por auditor
- `start_date` - Desde fecha
- `end_date` - Hasta fecha
- `criticality` - Nivel de criticidad

### Feedbacks
- `POST /api/feedbacks/` - Crear feedback
- `GET /api/feedbacks/` - Listar feedbacks
- `GET /api/feedbacks/{id}` - Obtener feedback específico
- `PUT /api/feedbacks/{id}` - Actualizar feedback
- `POST /api/feedbacks/{id}/analyze` - Analizar impacto del feedback

### Análisis
- `GET /api/analytics/dashboard` - Estadísticas generales
- `GET /api/analytics/agents/{id}/performance` - Desempeño de agente
- `GET /api/analytics/agents/ranking` - Ranking de agentes

## 📁 Estructura del Proyecto

```
Query/
├── main.py                 # Servidor FastAPI y endpoints
├── database.py            # Modelos de base de datos
├── schemas.py             # Schemas de validación
├── requirements.txt       # Dependencias
├── init_sample_data.py    # Script para datos de ejemplo
├── performance_evaluation.db  # Base de datos SQLite (se crea al iniciar)
├── static/
│   ├── index.html        # Interfaz principal
│   ├── css/
│   │   └── styles.css    # Estilos
│   └── js/
│       └── app.js        # Lógica del frontend
└── README_PERFORMANCE_SYSTEM.md  # Esta documentación
```

## 🎨 Casos de Uso

### Caso 1: Identificar Agentes con Problemas
1. Ve al Dashboard
2. Observa la tasa de error promedio
3. Revisa el ranking de agentes
4. Identifica agentes con alta tasa de error o baja calificación TNPS

### Caso 2: Dar Seguimiento a Mejora Después de Feedback
1. Entrega un feedback a un agente específico
2. Espera al menos 30 días
3. Click en "Analizar" en el feedback
4. Revisa el porcentaje de mejora
5. Toma decisiones basadas en datos

### Caso 3: Auditar y Clasificar Errores
1. Registra cada llamada auditada
2. Clasifica el nivel de criticidad
3. Describe el tipo de error
4. Registra la satisfacción del cliente (TNPS)
5. Usa los filtros para identificar patrones

### Caso 4: Evaluar Desempeño Individual
1. Ve a "Análisis"
2. Selecciona un agente
3. Revisa todas sus métricas
4. Observa los tipos de errores más comunes
5. Revisa el impacto de feedbacks anteriores
6. Planifica próximas acciones de desarrollo

## 🔐 Datos de Seguridad

- La base de datos es SQLite (archivo local)
- Para producción, considera migrar a PostgreSQL o MySQL
- Implementa autenticación si el sistema será expuesto a internet
- Los datos sensibles deben ser encriptados en producción

## 🚀 Migración a Producción

Para llevar este sistema a producción:

1. **Base de datos**: Cambia SQLite por PostgreSQL
   ```python
   SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/performance_db"
   ```

2. **Servidor**: Usa Gunicorn o similar
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. **Variables de entorno**: Usa variables de entorno para configuración sensible

4. **Autenticación**: Implementa JWT o OAuth2

5. **HTTPS**: Usa certificados SSL/TLS

## 💡 Próximas Mejoras Sugeridas

- [ ] Exportar reportes a Excel/PDF
- [ ] Gráficos interactivos con Chart.js
- [ ] Notificaciones por email
- [ ] Integración con calendario para seguimiento de feedbacks
- [ ] Sistema de roles y permisos
- [ ] Historial de cambios y auditoría
- [ ] Dashboard personalizable
- [ ] Predicción de desempeño con ML

## 📞 Soporte

Para preguntas o problemas, revisa los logs en la consola donde iniciaste el servidor.

---

**Desarrollado para optimizar el proceso de evaluación del desempeño y mejora continua de agentes de call center.**

