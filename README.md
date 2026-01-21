# 📊 Sistema de Evaluación del Desempeño

Sistema completo de evaluación del desempeño automatizado para auditar llamadas de cancelaciones de tarjetas de crédito y cuentas de ahorro, con análisis automático de impacto de feedbacks.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🎯 Características Principales

### ✅ Auditorías de Llamadas
- Registro completo de llamadas con customer ID
- Clasificación por nivel de criticidad (baja, media, alta, crítica)
- Tipos de error y descripciones detalladas
- Calificación TNPS (promoter, neutral, detractor, null)
- Sistema de filtros avanzado

### ✅ Gestión de Feedbacks
- Registro estructurado de feedback a agentes
- Definición de planes de acción
- **Análisis automático de impacto pre/post feedback**
- Comparación de errores antes y después
- Cálculo de porcentaje de mejora

### ✅ Dashboard y Análisis
- Vista general con métricas clave
- Desempeño individual por agente
- Distribución visual de TNPS
- Análisis de tipos de errores más comunes
- Ranking de agentes por desempeño
- Identificación de necesidades de capacitación

### ✅ Plan Individual de Desarrollo
- Seguimiento de mejora continua
- Identificación de brechas de desempeño
- Visualización de progreso post-feedback

## 🚀 Inicio Rápido

### Requisitos
- Python 3.8+
- pip

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO

# 2. Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Inicializar con datos de ejemplo (opcional)
python init_sample_data.py

# 5. Iniciar servidor
python main.py
```

O simplemente usa el script automático:
```bash
./start_server.sh
```

Visita: **http://localhost:8000**

## 📸 Screenshots

### Dashboard
Vista general con métricas clave del equipo

### Auditorías
Registro y seguimiento de todas las llamadas auditadas

### Análisis de Impacto
Comparación automática de desempeño antes y después de feedbacks

## 🏗️ Arquitectura

### Backend
- **Framework**: FastAPI
- **Base de Datos**: SQLite (migrable a PostgreSQL)
- **ORM**: SQLAlchemy
- **Validación**: Pydantic

### Frontend
- HTML5 + CSS3 + JavaScript
- Diseño moderno y responsivo
- Single Page Application (SPA)

## 📚 Documentación

- [**Documentación Completa**](README_PERFORMANCE_SYSTEM.md) - Información técnica detallada
- [**Guía Rápida**](GUIA_RAPIDA.md) - Tutorial paso a paso de uso
- [**Resumen del Sistema**](RESUMEN_SISTEMA.md) - Resumen ejecutivo
- [**Guía de Producción**](PRODUCCION_DEPLOYMENT.md) - Deploy a producción

## 🔑 Funcionalidad Estrella

### Análisis Automático de Impacto de Feedback

El sistema puede analizar automáticamente si un feedback fue efectivo:

1. Registras un feedback a un agente
2. Esperas un período (recomendado: 30 días)
3. Click en "Analizar"
4. El sistema automáticamente:
   - ✅ Cuenta errores 30 días ANTES del feedback
   - ✅ Cuenta errores 30 días DESPUÉS del feedback
   - ✅ Calcula porcentaje de mejora
   - ✅ Identifica si el agente mejoró o empeoró

**Resultados claros:**
- ✅ +50%: Excelente mejora
- ✅ +20%: Buena mejora
- 🟡 +10%: Leve mejora
- 🔴 Negativo: Empeoró (necesita más atención)

## 📊 API Endpoints

### Agentes
- `POST /api/agents/` - Crear agente
- `GET /api/agents/` - Listar agentes
- `GET /api/agents/{id}` - Obtener agente específico

### Auditorías
- `POST /api/audits/` - Crear auditoría
- `GET /api/audits/` - Listar con filtros
- `GET /api/audits/{id}` - Obtener auditoría

### Feedbacks
- `POST /api/feedbacks/` - Crear feedback
- `GET /api/feedbacks/` - Listar feedbacks
- `POST /api/feedbacks/{id}/analyze` - **Analizar impacto automáticamente**

### Análisis
- `GET /api/analytics/dashboard` - Estadísticas generales
- `GET /api/analytics/agents/{id}/performance` - Desempeño de agente
- `GET /api/analytics/agents/ranking` - Ranking de agentes

## 🎯 Casos de Uso

1. **Auditar Llamadas**: Registra y clasifica cada llamada por criticidad y tipo de error
2. **Dar Feedback Efectivo**: Proporciona retroalimentación estructurada con plan de acción
3. **Medir Impacto**: Analiza objetivamente si tus intervenciones están funcionando
4. **Identificar Patrones**: Encuentra tipos de errores comunes y necesidades de capacitación
5. **Reconocer Mejoras**: Identifica y reconoce a agentes que están mejorando

## 🔐 Seguridad

Para uso en producción, consulta [PRODUCCION_DEPLOYMENT.md](PRODUCCION_DEPLOYMENT.md) para:
- Migración a PostgreSQL
- Implementación de autenticación JWT
- Configuración de HTTPS
- Sistema de roles y permisos
- Backups automáticos

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **Valentina Claros** - *Desarrollo inicial*

## 🙏 Agradecimientos

- FastAPI por el excelente framework
- Comunidad de Python por las librerías utilizadas
- Diseño inspirado en herramientas modernas de SaaS

## 📞 Soporte

Para preguntas, problemas o sugerencias:
- Abre un [Issue](../../issues)
- Consulta la [documentación](README_PERFORMANCE_SYSTEM.md)
- Revisa la [guía rápida](GUIA_RAPIDA.md)

---

**Desarrollado para optimizar el proceso de evaluación del desempeño y mejora continua de agentes de call center** 🚀

