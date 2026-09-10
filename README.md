# KeyNest

Gestor de contraseñas colaborativo para familia y amigos — una alternativa a compartir un `.kdbx` de KeePass a mano. Varias personas ven y editan el mismo set de credenciales, sincronizado en tiempo real, sin que el servidor pueda leer ni una sola contraseña.

## Modelo de seguridad

Zero-knowledge de verdad, no solo de nombre:

- Cada usuario genera un par de claves **RSA-OAEP-2048** en el navegador al registrarse. La privada se cifra con una clave derivada de su master password (**PBKDF2-SHA256**, 600k iteraciones) antes de subirla — el servidor nunca ve la privada en claro.
- Cada grupo tiene una clave simétrica **AES-GCM-256** generada en el cliente. Se guarda una copia por miembro, cada una envuelta con la clave pública de ese miembro (mismo patrón que Bitwarden Organizations). Invitar a alguien es desenvolver la clave con tu privada (en memoria, nunca sale del cliente) y reenvolverla con la pública del invitado.
- Solo la **contraseña** de cada credencial va cifrada (AES-GCM con la clave del grupo). Título, usuario, URL y notas quedan en claro para poder buscar sin descifrar nada.
- La contraseña nunca se renderiza por defecto: copiar la manda directo al portapapeles, verla es una acción explícita aparte. El registro de actividad del grupo nunca guarda secretos, solo etiquetas ya públicas en otro sitio (título, nombre de carpeta, email).
- RLS estricto en Postgres por pertenencia a grupo — verificado con un test de integración real (ver [`src/lib/rlsIsolationCheck.ts`](src/lib/rlsIsolationCheck.ts)): una cuenta sin invitar no puede leer ni escribir nada de un grupo ajeno, ni conociendo los IDs.

Contrapartida consciente del modelo zero-knowledge: si olvidás la master password, es irrecuperable por diseño — no hay backdoor ni frase de recuperación implementada todavía.

## Stack

- **Frontend:** React + TypeScript + Vite, sistema de diseño propio ("Industry": blueprint técnico, acero sobre papel).
- **Backend:** Supabase (Auth + Postgres + Row Level Security).
- **Cripto:** Web Crypto API nativa del navegador, sin librerías externas.

## Empezar en local

```bash
npm install
cp .env.local.example .env.local   # completar con tu proyecto Supabase
```

En `.env.local`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-publishable-key
```

Correr el esquema completo en el SQL Editor de tu proyecto Supabase: [`supabase/schema.sql`](supabase/schema.sql).

```bash
npm run dev         # servidor local
npm run typecheck   # tsc --noEmit
npm test            # tests de cripto (unitarios, sin red)
npm run build       # build de produccion
```

### Verificar el aislamiento RLS

`src/lib/rlsIsolationCheck.ts` es un test de integración que crea dos cuentas reales contra tu Supabase y confirma que una no puede tocar nada del grupo de la otra. No forma parte de `npm test` (crea datos reales en cada corrida):

```bash
npx vitest run -c vitest.rls.config.ts
```

## Despliegue

Configurado para Netlify (`netlify.toml`: `npm run build` → `dist/`). Solo hace falta declarar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` como variables de entorno del sitio.

## Qué hace hoy

- Registro/login con generación de claves, sesión persistida por navegador (Supabase Auth), bloqueo manual que solo pide la master password (no cierra sesión).
- Grupos: crear, renombrar, borrar, invitar por email, quitar miembros, roles admin/member.
- Carpetas anidadas sin límite de profundidad, colapsables.
- Credenciales: crear/editar/borrar con confirmación, generador de contraseñas, medidor de fuerza, copiar sin mostrar, revelar bajo demanda.
- Registro de actividad por grupo y por credencial (quién hizo qué y cuándo).
- Responsive: bóveda de escritorio (raíl + lista + detalle) y versión móvil dedicada.

## Fuera de alcance (por ahora)

- Auto-bloqueo por inactividad (hoy el bloqueo es manual).
- Rotación de la clave de grupo al eliminar un miembro (conserva acceso a lo que ya tenía en memoria hasta ese momento).
- Recuperación de master password (frase de respaldo).
- Importación desde `.kdbx` de KeePass.
- Modo oscuro.
