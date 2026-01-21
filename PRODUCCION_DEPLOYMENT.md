# 🚀 Guía de Migración a Producción

## 📋 Índice
1. [Migración de Base de Datos](#migración-de-base-de-datos)
2. [Configuración de Servidor](#configuración-de-servidor)
3. [Seguridad](#seguridad)
4. [Integraciones](#integraciones)
5. [Monitoreo](#monitoreo)
6. [Backup y Recuperación](#backup-y-recuperación)

---

## 1. Migración de Base de Datos

### De SQLite a PostgreSQL

#### Paso 1: Instalar PostgreSQL
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Iniciar servicio
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux
```

#### Paso 2: Crear base de datos
```bash
# Conectar a PostgreSQL
psql postgres

# Crear base de datos y usuario
CREATE DATABASE performance_db;
CREATE USER performance_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE performance_db TO performance_user;
```

#### Paso 3: Actualizar configuración
```python
# database.py - Cambiar línea 7
# De:
SQLALCHEMY_DATABASE_URL = "sqlite:///./performance_evaluation.db"

# A:
SQLALCHEMY_DATABASE_URL = "postgresql://performance_user:tu_password_seguro@localhost/performance_db"

# Nota: NO incluyas connect_args para PostgreSQL
# Cambia línea 9-10:
engine = create_engine(SQLALCHEMY_DATABASE_URL)
```

#### Paso 4: Migrar datos existentes
```bash
# Instalar herramienta de migración
pip install pgloader

# Migrar datos
pgloader performance_evaluation.db postgresql://performance_user:password@localhost/performance_db
```

**Alternativa: Exportar/Importar manualmente**
```bash
# 1. Exportar datos de SQLite
sqlite3 performance_evaluation.db .dump > data_export.sql

# 2. Limpiar y adaptar SQL para PostgreSQL
# (Necesitarás editar el archivo manualmente)

# 3. Importar a PostgreSQL
psql -U performance_user -d performance_db -f data_export.sql
```

---

## 2. Configuración de Servidor

### Opción A: Gunicorn (Recomendado)

#### Instalación
```bash
pip install gunicorn
```

#### Actualizar requirements.txt
```
gunicorn==21.2.0
```

#### Crear archivo de configuración
```python
# gunicorn_config.py
bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5
errorlog = "logs/error.log"
accesslog = "logs/access.log"
```

#### Iniciar servidor
```bash
# Crear directorio de logs
mkdir logs

# Iniciar con Gunicorn
gunicorn main:app -c gunicorn_config.py
```

### Opción B: Docker

#### Crear Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copiar archivos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

#### Crear docker-compose.yml
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db/performance_db
    depends_on:
      - db
    volumes:
      - ./static:/app/static

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=performance_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Construir y ejecutar
```bash
docker-compose up -d
```

---

## 3. Seguridad

### Variables de Entorno

#### Crear archivo .env
```bash
# .env
DATABASE_URL=postgresql://user:password@localhost/performance_db
SECRET_KEY=tu_clave_secreta_muy_larga_y_segura
ENVIRONMENT=production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

#### Actualizar database.py
```python
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./performance_evaluation.db")
```

#### Actualizar .gitignore
```
.env
*.db
```

### Autenticación JWT

#### Instalar dependencias
```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

#### Crear módulo de autenticación
```python
# auth.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
```

#### Proteger endpoints
```python
# main.py
from auth import verify_token, oauth2_scheme
from fastapi import Depends

@app.get("/api/agents/")
def get_agents(token: str = Depends(oauth2_scheme)):
    verify_token(token)
    # ... resto del código
```

### CORS (si necesitas acceso desde otros dominios)
```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # En producción, especifica dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### HTTPS con Nginx

#### Instalar Nginx
```bash
# Ubuntu/Debian
sudo apt-get install nginx

# macOS
brew install nginx
```

#### Configurar Nginx
```nginx
# /etc/nginx/sites-available/performance-system
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /path/to/Query/static/;
    }
}
```

#### SSL con Let's Encrypt
```bash
# Instalar certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d yourdomain.com
```

---

## 4. Integraciones

### Integración con Email (Notificaciones)

#### Instalar dependencias
```bash
pip install aiosmtplib
```

#### Crear servicio de email
```python
# email_service.py
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

async def send_email(to: str, subject: str, body: str):
    message = MIMEMultipart()
    message["From"] = os.getenv("EMAIL_FROM")
    message["To"] = to
    message["Subject"] = subject
    message.attach(MIMEText(body, "html"))

    await aiosmtplib.send(
        message,
        hostname=os.getenv("SMTP_HOST"),
        port=int(os.getenv("SMTP_PORT", 587)),
        username=os.getenv("SMTP_USER"),
        password=os.getenv("SMTP_PASSWORD"),
        use_tls=True
    )

# Uso en main.py
@app.post("/api/feedbacks/")
async def create_feedback(feedback: schemas.FeedbackCreate, db: Session = Depends(database.get_db)):
    # ... crear feedback ...
    
    # Enviar notificación
    agent = db.query(database.Agent).filter(database.Agent.id == feedback.agent_id).first()
    await send_email(
        to=agent.email,
        subject="Nuevo Feedback Recibido",
        body=f"<h2>Hola {agent.name}</h2><p>Has recibido un nuevo feedback: {feedback.title}</p>"
    )
    
    return db_feedback
```

### Integración con Twilio (ya tienes archivos base)

```python
# Extender twilio_connection.py para notificaciones SMS
from twilio.rest import Client

def send_sms_notification(agent_phone: str, message: str):
    client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    
    message = client.messages.create(
        body=message,
        from_=os.getenv("TWILIO_PHONE_NUMBER"),
        to=agent_phone
    )
    
    return message.sid
```

### Integración con Slack

```bash
pip install slack-sdk
```

```python
# slack_service.py
from slack_sdk import WebClient
import os

slack_client = WebClient(token=os.getenv("SLACK_BOT_TOKEN"))

def send_slack_notification(channel: str, message: str):
    response = slack_client.chat_postMessage(
        channel=channel,
        text=message
    )
    return response

# Uso: Notificar cuando hay un error crítico
@app.post("/api/audits/")
def create_audit(audit: schemas.CallAuditCreate, db: Session = Depends(database.get_db)):
    db_audit = database.CallAudit(**audit.dict())
    db.add(db_audit)
    db.commit()
    
    # Notificar errores críticos
    if db_audit.criticality_level == "crítica":
        send_slack_notification(
            channel="#quality-alerts",
            message=f"⚠️ Error Crítico detectado por {db_audit.agent.name}"
        )
    
    return db_audit
```

### Exportación a Excel

```bash
pip install openpyxl
```

```python
# export_service.py
from openpyxl import Workbook
from datetime import datetime

def export_audits_to_excel(audits: list, filename: str):
    wb = Workbook()
    ws = wb.active
    ws.title = "Auditorías"
    
    # Headers
    headers = ["ID", "Fecha", "Customer ID", "Agente", "Tipo", "Criticidad", "Error", "TNPS"]
    ws.append(headers)
    
    # Data
    for audit in audits:
        ws.append([
            audit.id,
            audit.call_date.strftime("%Y-%m-%d %H:%M"),
            audit.customer_id,
            audit.agent.name,
            audit.call_type,
            audit.criticality_level,
            audit.error_type or "-",
            audit.tnps_score or "-"
        ])
    
    wb.save(filename)
    return filename

# Endpoint en main.py
from fastapi.responses import FileResponse

@app.get("/api/audits/export")
def export_audits(db: Session = Depends(database.get_db)):
    audits = db.query(database.CallAudit).all()
    filename = f"audits_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    export_audits_to_excel(audits, filename)
    return FileResponse(filename, filename=filename)
```

---

## 5. Monitoreo

### Logging Avanzado

```python
# logging_config.py
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    logger = logging.getLogger("performance_system")
    logger.setLevel(logging.INFO)
    
    # Archivo de logs
    handler = RotatingFileHandler(
        "logs/app.log",
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

# En main.py
from logging_config import setup_logging

logger = setup_logging()

@app.post("/api/audits/")
def create_audit(audit: schemas.CallAuditCreate, db: Session = Depends(database.get_db)):
    logger.info(f"Creating audit for customer {audit.customer_id} by agent {audit.agent_id}")
    # ... resto del código
```

### Métricas con Prometheus (Opcional)

```bash
pip install prometheus-fastapi-instrumentator
```

```python
# main.py
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()

# Instrumentar app
Instrumentator().instrument(app).expose(app)

# Acceder métricas en /metrics
```

---

## 6. Backup y Recuperación

### Backup Automático de PostgreSQL

#### Crear script de backup
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="performance_db"
DB_USER="performance_user"

# Crear backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Mantener solo últimos 30 días
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completado: backup_$DATE.sql.gz"
```

#### Automatizar con cron
```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2am)
0 2 * * * /path/to/backup.sh
```

### Restaurar desde Backup

```bash
# Descomprimir y restaurar
gunzip -c backup_20260121_020000.sql.gz | psql -U performance_user -d performance_db
```

### Backup de Archivos Estáticos

```bash
#!/bin/bash
# backup_files.sh

rsync -avz /path/to/Query/ /path/to/backup/Query_$(date +%Y%m%d)/
```

---

## 7. Checklist de Producción

### Pre-Lanzamiento
- [ ] Migrar a PostgreSQL
- [ ] Configurar variables de entorno
- [ ] Implementar autenticación
- [ ] Configurar HTTPS
- [ ] Configurar Nginx/Apache
- [ ] Establecer límites de rate limiting
- [ ] Configurar CORS correctamente
- [ ] Habilitar logging
- [ ] Configurar backups automáticos
- [ ] Probar recuperación de backups

### Post-Lanzamiento
- [ ] Monitorear logs diariamente
- [ ] Revisar métricas de desempeño
- [ ] Verificar backups semanalmente
- [ ] Actualizar dependencias mensualmente
- [ ] Revisar alertas de seguridad
- [ ] Optimizar queries lentas
- [ ] Documentar cambios

---

## 8. Estimación de Costos (AWS Example)

### Infraestructura Básica
- **EC2 t3.small** (2 vCPU, 2GB RAM): $15-20/mes
- **RDS PostgreSQL db.t3.micro**: $15-20/mes
- **S3 para backups** (50GB): $1-2/mes
- **Route 53** (dominio): $1/mes
- **Total**: ~$35-45/mes

### Escalado Medio
- **EC2 t3.medium** (2 vCPU, 4GB RAM): $30-35/mes
- **RDS PostgreSQL db.t3.small**: $25-30/mes
- **Load Balancer**: $20/mes
- **Total**: ~$75-85/mes

---

## 9. Mejores Prácticas

### Seguridad
1. **Nunca** expongas claves en el código
2. Usa variables de entorno para secretos
3. Implementa rate limiting
4. Valida todos los inputs
5. Usa HTTPS siempre
6. Actualiza dependencias regularmente

### Desempeño
1. Usa índices en base de datos
2. Implementa caché (Redis)
3. Optimiza queries N+1
4. Comprime respuestas JSON
5. Usa CDN para archivos estáticos

### Mantenimiento
1. Documenta todos los cambios
2. Usa versionamiento semántico
3. Mantén logs organizados
4. Prueba backups regularmente
5. Monitorea métricas clave

---

## 10. Soporte y Comunidad

### Recursos
- FastAPI Docs: https://fastapi.tiangolo.com
- SQLAlchemy Docs: https://docs.sqlalchemy.org
- PostgreSQL Docs: https://www.postgresql.org/docs

### Troubleshooting Común

**Error: "too many connections"**
```python
# Limitar pool de conexiones
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10,
    max_overflow=20
)
```

**Error: "slow queries"**
```python
# Agregar índices
from sqlalchemy import Index

Index('idx_agent_id', CallAudit.agent_id)
Index('idx_call_date', CallAudit.call_date)
```

---

¡Éxito con tu deployment! 🚀

