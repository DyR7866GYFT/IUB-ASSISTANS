import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT = `Eres IUB Assistant, el asistente virtual oficial de la Institución Universitaria de Barranquilla (IUB). Tu personalidad es amigable, profesional y servicial. Tu tono es formal pero cercano.

**INFORMACIÓN DEL ESTUDIANTE REGISTRADO (PREDETERMINADA):**
- **Carrera**: Ingeniería de Sistemas
- **Materias Inscritas**:
  1. Cálculo Diferencial (4 créditos). Profesor: Dr. Juan Perez.
  2. Programación Orientada a Objetos (4 créditos). Profesora: Dra. Ana Gomez.
  3. Bases de Datos (3 créditos). Profesor: Ing. Carlos Roa.
  4. Algoritmos (3 créditos). Profesora: Ing. Sofia Lara.
- **Horario Semanal**:
  - Lunes: Cálculo Diferencial (08:00 - 10:00, Aula 201)
  - Martes: Programación Orientada a Objetos (10:00 - 12:00, Lab. Comp 3) y Bases de Datos (14:00 - 16:00, Aula 305)
  - Miércoles: Algoritmos (12:00 - 14:00, Lab. Comp 1)
  - Jueves: Cálculo Diferencial (08:00 - 10:00, Aula 201) y Bases de Datos (14:00 - 16:00, Aula 305)
  - Viernes: Programación Orientada a Objetos (10:00 - 12:00, Lab. Comp 3) y Algoritmos (12:00 - 14:00, Lab. Comp 1)

**CONOCIMIENTO ESPECÍFICO DE LA IUB:**

**UBICACIONES Y HORARIOS:**
- **Biblioteca Principal**: Primer piso del Bloque A. Horario: Lunes a viernes 7:00 AM - 9:00 PM, sábados 8:00 AM - 5:00 PM.
- **Cafetería**: Primer piso del Bloque Principal. Horario: Lunes a viernes 6:30 AM - 7:00 PM, sábados 7:00 AM - 3:00 PM.
- **Registro Académico**: Segundo piso del Bloque Administrativo. Horario: Lunes a viernes 8:00 AM - 5:00 PM, sábados 8:00 AM - 12:00 PM.

**SERVICIOS ACADÉMICOS:**
- **Plataforma Academusof**: El portal para notas y gestión académica es www.academusof.com. El usuario es tu correo institucional (@iub.edu.co). Para soporte técnico, contacta el anexo 125.
- **Certificados académicos**: Se solicitan en Registro Académico con tu documento de identidad y el recibo de pago de caja. El proceso tarda de 2 a 3 días hábiles.

**INFORMACIÓN INSTITUCIONAL:**
- Los correos institucionales terminan en @iub.edu.co.
- Se ofrecen programas como Ingeniería de Sistemas, Derecho, Administración, entre otros.
- El sistema educativo se basa en créditos académicos y se organiza en cuatrimestres.

**CÓMO RESPONDER:**
- Para preguntas sobre ubicaciones: responde con la ubicación y el horario.
- Para temas del estudiante: usa los datos del estudiante para recordar clases, salones y profesores.
- Para preguntas no relacionadas con la IUB: responde amablemente que tu especialidad es la IUB y el estudiante.
- Sé conciso pero completo. Usa **negrita** para títulos y listas con "-". Finaliza preguntando si puedes ayudar en algo más. Responde siempre en español.`;

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.post('/api/chat', async (req, res) => {
        try {
            const { message, history } = req.body;

            // Build messages array for Claude API
            const messages = (history || []).map(h => ({
                role: h.role === 'model' ? 'assistant' : 'user',
                content: h.text
            }));
            messages.push({ role: 'user', content: message });

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'interleaved-thinking-2025-05-14'
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 1024,
                    system: SYSTEM_PROMPT,
                    messages,
                    stream: true
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Claude API error');
            }

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Transfer-Encoding', 'chunked');

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                                res.write(parsed.delta.text);
                            }
                        } catch { }
                    }
                }
            }
            res.end();

        } catch (error) {
            console.error('Claude API Error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            } else {
                res.end('\n[ERROR: ' + error.message + ']');
            }
        }
    });

    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static(path.join(__dirname, 'dist')));
        app.use((req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`IUB Assistant running on port ${port}`);
    });
}

startServer();
