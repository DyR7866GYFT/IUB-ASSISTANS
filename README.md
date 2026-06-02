# 🎓 IUB Assistant
**Chatbot con IA para estudiantes de primer ingreso — Institución Universitaria de Barranquilla**

![Estado](https://img.shields.io/badge/estado-prototipo%20local-blue)
![React](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61DAFB?logo=react)
![Firebase](https://img.shields.io/badge/auth-Firebase-FFCA28?logo=firebase)
![Claude](https://img.shields.io/badge/IA-Claude%20API-blueviolet)

---

## Descripción

IUB Assistant es un prototipo funcional desarrollado como propuesta académica para la Institución Universitaria de Barranquilla. El sistema consiste en una aplicación web con un asistente conversacional inteligente que centraliza la información institucional y permite a los estudiantes de primer ingreso resolver dudas sobre horarios, materias, ubicaciones y servicios — disponible 24/7.

El proyecto fue desarrollado y validado en entorno local. Su arquitectura está diseñada para escalar a nivel institucional con el respaldo del cuerpo administrativo de la IUB, lo que permitiría en el futuro desplegar el sistema para toda la comunidad estudiantil.

---

## Estado del proyecto

> **Prototipo local — Propuesta institucional**
>
> El sistema fue desarrollado, probado y validado en entorno local como proyecto final de módulo. Un despliegue a producción a escala institucional requeriría integración con los sistemas administrativos de la IUB (Academusof, bases de datos de estudiantes reales) y financiamiento para infraestructura en la nube.

---

## Funcionalidades del prototipo

- 🔐 Login y registro con Firebase Authentication
- 💬 Chat con IA en tiempo real (streaming) impulsado por Claude API
- 📅 Dashboard con horario semanal personalizado
- 📚 Vista de materias inscritas con profesores y créditos
- 🏫 Información institucional: biblioteca, cafetería, registro académico

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite |
| Autenticación | Firebase Authentication |
| IA / Chatbot | Anthropic Claude API (streaming) |
| Backend | Node.js + Express |

---

## Cómo correrlo localmente

```bash
# 1. Clona el repo
git clone https://github.com/DyR7866GYFT/DYLAN_RICARDO_MARTINEZ.git
cd DYLAN_RICARDO_MARTINEZ

# 2. Instala dependencias
npm install

# 3. Crea tu archivo de variables de entorno
cp .env.example .env.local
# Edita .env.local y agrega tu ANTHROPIC_API_KEY

# 4. Corre el servidor
npm run dev
```

Abre `http://localhost:3000` en tu navegador.

---

## Variables de entorno

```env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Autor

**Dylan Ricardo Martínez** · Técnico en Mantenimiento de Sistemas  
Institución Universitaria de Barranquilla · 2025  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-dylan--ricardo-0077B5?logo=linkedin)](https://www.linkedin.com/in/dylan-ricardo-152838396)
