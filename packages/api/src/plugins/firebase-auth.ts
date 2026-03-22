import type { FastifyInstance } from 'fastify';
import type { App } from 'firebase-admin/app';
import fp from 'fastify-plugin';

// ── User type augmentation ─────────────────────────
export interface AuthUser {
  uid: string;
  email: string;
  tenantId: string;
  tier: 'free' | 'pro' | 'team' | 'agency';
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

// ── Firebase Admin lazy init ───────────────────────
let firebaseApp: App | null = null;

async function getFirebaseApp(): Promise<App> {
  if (firebaseApp) return firebaseApp;

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');

  if (getApps().length === 0) {
    const projectId = process.env['FIREBASE_PROJECT_ID'];
    const serviceAccountPath = process.env['FIREBASE_SERVICE_ACCOUNT_PATH'];
    const serviceAccountJson = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];

    if (serviceAccountPath) {
      const { readFileSync } = await import('node:fs');
      const serviceAccount = JSON.parse(
        readFileSync(serviceAccountPath, 'utf-8'),
      );
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else if (serviceAccountJson) {
      // Cloud Run: SA credential passed as JSON string
      const serviceAccount = JSON.parse(serviceAccountJson);
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else {
      // Fallback: application default credentials
      firebaseApp = initializeApp({ projectId });
    }
  } else {
    firebaseApp = getApps()[0]!;
  }

  return firebaseApp;
}

// ── Token verifier ─────────────────────────────────
export async function verifyToken(token: string): Promise<AuthUser> {
  await getFirebaseApp();
  const { getAuth } = await import('firebase-admin/auth');
  const decoded = await getAuth().verifyIdToken(token);

  return {
    uid: decoded.uid,
    email: decoded.email ?? '',
    tenantId: (decoded['tenantId'] as string) ?? decoded.uid,
    tier: ((decoded['tier'] as string) ?? 'free') as AuthUser['tier'],
  };
}

// ── Fastify plugin ─────────────────────────────────
async function firebaseAuthPluginFn(app: FastifyInstance) {
  // Decorate request with empty user (Fastify requires decoration before use)
  app.decorateRequest('user', null as unknown as AuthUser);

  app.addHook('onReady', async () => {
    try {
      await getFirebaseApp();
      app.log.info('✅ Firebase Admin SDK initialized');
    } catch (err) {
      app.log.warn({ err }, '⚠️  Firebase Admin SDK init failed — auth will fail');
    }
  });
}

export const firebaseAuthPlugin = fp(firebaseAuthPluginFn, {
  name: 'firebase-auth',
});
