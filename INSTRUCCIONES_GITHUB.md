# 📤 Instrucciones para Subir a GitHub

## ✅ Estado Actual

Tu repositorio Git local está listo con:
- ✅ 2 commits realizados
- ✅ 29 archivos preparados
- ✅ .gitignore configurado correctamente
- ✅ README.md principal creado
- ✅ Documentación completa incluida

## 🚀 Pasos para Subir a GitHub

### Paso 1: Crear el Repositorio en GitHub

1. **Ve a GitHub**: https://github.com
2. **Inicia sesión** con tu cuenta
3. **Click en el botón "+" (arriba derecha)** → "New repository"
4. **Completa la información**:
   - **Repository name**: `sistema-evaluacion-desempeno` (o el nombre que prefieras)
   - **Description**: "Sistema de evaluación del desempeño para auditoría de llamadas"
   - **Visibilidad**: 
     - ✅ **Public** - Si quieres que sea público
     - ⚠️ **Private** - Si contiene información sensible de tu empresa
   - **NO marques ninguna opción** de:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   
   *(Ya tienes estos archivos en tu repo local)*

5. **Click en "Create repository"**

### Paso 2: Conectar tu Repositorio Local con GitHub

Una vez creado el repositorio en GitHub, verás una pantalla con comandos. **Usa estos comandos**:

```bash
# En tu terminal, desde el directorio del proyecto:
cd /Users/valentina.claros/Desktop/Query

# Conectar con tu repositorio de GitHub
# (Reemplaza TU_USUARIO y TU_REPOSITORIO con los valores reales)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Verificar que se conectó correctamente
git remote -v
```

### Paso 3: Subir tu Código a GitHub

```bash
# Subir la rama main a GitHub
git push -u origin main
```

**Importante**: Si tienes autenticación de dos factores (2FA) en GitHub:
- GitHub te pedirá un **Personal Access Token** en lugar de tu contraseña
- Si no tienes uno, créalo en: GitHub → Settings → Developer settings → Personal access tokens → Generate new token

### Paso 4: Verificar

1. Ve a tu repositorio en GitHub: `https://github.com/TU_USUARIO/TU_REPOSITORIO`
2. Deberías ver:
   - ✅ README.md principal mostrándose
   - ✅ Todos tus archivos
   - ✅ 2 commits
   - ✅ Documentación completa

---

## 🔐 Autenticación con GitHub

### Opción A: HTTPS con Personal Access Token (Recomendado)

1. **Crear Token**:
   - Ve a: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Nombre: "Sistema Evaluación - Desktop"
   - Scopes: Marca "repo" (acceso completo a repositorios)
   - Click "Generate token"
   - **¡COPIA EL TOKEN!** (no lo volverás a ver)

2. **Usar el Token**:
   - Cuando hagas `git push`, GitHub pedirá usuario y contraseña
   - Username: tu usuario de GitHub
   - Password: **pega el token** (no tu contraseña real)

3. **Guardar credenciales** (opcional, para no ingresarlas cada vez):
   ```bash
   git config --global credential.helper osxkeychain
   ```

### Opción B: SSH (Más seguro, una sola configuración)

Si prefieres SSH (no necesitas ingresar token cada vez):

1. **Generar clave SSH**:
   ```bash
   ssh-keygen -t ed25519 -C "tu_email@example.com"
   # Presiona Enter para aceptar ubicación por defecto
   # Ingresa una contraseña (opcional pero recomendado)
   ```

2. **Agregar clave a ssh-agent**:
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. **Copiar clave pública**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copia todo el contenido
   ```

4. **Agregar a GitHub**:
   - Ve a: https://github.com/settings/keys
   - Click "New SSH key"
   - Title: "MacBook - Sistema Evaluación"
   - Key: pega el contenido copiado
   - Click "Add SSH key"

5. **Cambiar remote a SSH**:
   ```bash
   cd /Users/valentina.claros/Desktop/Query
   git remote set-url origin git@github.com:TU_USUARIO/TU_REPOSITORIO.git
   ```

6. **Probar conexión**:
   ```bash
   ssh -T git@github.com
   # Deberías ver: Hi TU_USUARIO! You've successfully authenticated...
   ```

---

## 📝 Configurar tu Identidad Git (Recomendado)

Para que tus commits tengan tu nombre e email correctos:

```bash
git config --global user.name "Tu Nombre Completo"
git config --global user.email "tu_email@example.com"

# Verificar configuración
git config --global --list
```

Luego, actualiza el autor del commit anterior:
```bash
cd /Users/valentina.claros/Desktop/Query
git commit --amend --reset-author --no-edit
git push origin main --force
```

---

## 🔄 Comandos Git Útiles para el Futuro

### Agregar cambios nuevos
```bash
cd /Users/valentina.claros/Desktop/Query

# Ver qué cambió
git status

# Agregar archivos específicos
git add archivo1.py archivo2.js

# O agregar todos los cambios
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push origin main
```

### Ver historial
```bash
# Ver historial de commits
git log

# Ver historial compacto
git log --oneline

# Ver cambios en un archivo
git log -p archivo.py
```

### Deshacer cambios
```bash
# Descartar cambios no guardados en un archivo
git checkout -- archivo.py

# Volver al último commit (sin perder cambios)
git reset --soft HEAD~1

# Ver diferencias antes de commit
git diff
```

---

## 🌿 Crear Ramas (Opcional)

Para trabajar en nuevas features sin afectar main:

```bash
# Crear y cambiar a nueva rama
git checkout -b feature/nueva-funcionalidad

# Hacer cambios y commits normalmente
git add .
git commit -m "Add nueva funcionalidad"

# Subir rama a GitHub
git push origin feature/nueva-funcionalidad

# Volver a main
git checkout main

# Mergear cambios (cuando estés listo)
git merge feature/nueva-funcionalidad
```

---

## ⚠️ Archivos que NO se subirán (por .gitignore)

Estos archivos están excluidos y NO se subirán a GitHub (correcto):
- `venv/` - Entorno virtual (cada quien crea el suyo)
- `__pycache__/` - Archivos compilados de Python
- `performance_evaluation.db` - Base de datos (puede contener datos sensibles)
- `*.log` - Archivos de logs
- `.DS_Store` - Archivos del sistema macOS

---

## ✅ Checklist Final

Antes de hacer público tu repositorio (si aplica):

- [ ] Revisar que NO hay contraseñas o API keys en el código
- [ ] Verificar que NO hay datos sensibles de clientes
- [ ] Actualizar README.md con tu información de contacto
- [ ] Agregar LICENSE si es necesario
- [ ] Probar que el README se ve bien en GitHub
- [ ] Agregar una imagen o screenshot si tienes (opcional)

---

## 🎉 ¡Listo!

Una vez que hagas `git push`, tu código estará en GitHub y podrás:
- ✅ Compartirlo con tu equipo
- ✅ Trabajar desde cualquier computadora
- ✅ Hacer backup automático
- ✅ Colaborar con otros desarrolladores
- ✅ Tener historial completo de cambios
- ✅ Crear documentación wiki
- ✅ Gestionar issues y features

---

## 📞 Si tienes problemas:

### Error: "authentication failed"
→ Necesitas un Personal Access Token (ver Opción A arriba)

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
```

### Error: "! [rejected] main -> main (fetch first)"
```bash
git pull origin main --rebase
git push origin main
```

### Olvidé agregar algo al .gitignore
```bash
# Si ya hiciste commit pero NO push:
git reset HEAD~1
# Edita .gitignore
git add .
git commit -m "Update .gitignore and recommit"

# Si ya hiciste push:
# Edita .gitignore, luego:
git rm --cached archivo_a_ignorar
git commit -m "Remove tracked files that should be ignored"
git push origin main
```

---

**¿Listo para subirlo? ¡Adelante! 🚀**

Cualquier duda, consulta este documento.

