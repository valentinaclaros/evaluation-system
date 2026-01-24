# Sistema de Evaluación del Desempeño

Sistema web para gestionar auditorías de llamadas, feedbacks de agentes y análisis de desempeño.

## 🚀 Cómo usar

1. Abre `index.html` en tu navegador web
2. El sistema funciona completamente en el navegador (usa localStorage)
3. No requiere instalación ni servidor

## 📁 Estructura del proyecto

```
├── index.html              # Dashboard principal
├── styles.css              # Estilos del sistema
├── app.js                  # Funciones comunes y manejo de datos
├── dashboard.js            # Lógica del dashboard
├── agentes.html            # Gestión de agentes
├── agentes.js              # Lógica de agentes
├── analisis.html           # Análisis de mejoras
├── analisis.js             # Lógica de análisis
├── registrar-llamada.html  # Registro de auditorías
├── registrar-llamada.js    # Lógica de auditorías
├── registrar-feedback.html # Registro de feedbacks
└── registrar-feedback.js   # Lógica de feedbacks
```

## 📊 Funcionalidades

- **Dashboard**: Visualización de métricas generales, TNPS, criticidad de errores
- **Gestión de Agentes**: Agregar, editar y desactivar agentes
- **Registro de Auditorías**: Documentar llamadas auditadas con errores y criticidad
- **Registro de Feedbacks**: Dar retroalimentación a los agentes
- **Análisis**: Ver el desempeño de agentes en períodos específicos

## 💾 Datos

Los datos se almacenan localmente en tu navegador usando localStorage. Para limpiar todos los datos, usa la función de limpieza en el dashboard.

## 🌐 Navegación

- **Dashboard**: Inicio / Vista general
- **Registrar Auditoría**: Registrar nuevas auditorías de llamadas
- **Registrar Feedback**: Dar feedback a agentes
- **Análisis de Mejoras**: Ver análisis detallado por agente
- **Gestión de Agentes**: Administrar la lista de agentes
