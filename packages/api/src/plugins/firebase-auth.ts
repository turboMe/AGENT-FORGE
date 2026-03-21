import type { FastifyInstance } from 'fastify';
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
let firebaseAdmin: typeof import('firebase-admin') | null = null;

async function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  const admin = await import('firebase-admin');

  // Only init if no apps exist yet
  if (admin.default.apps.length === 0) {
    const projectId = process.env['FIREBASE_PROJECT_ID'];
    const serviceAccountPath = process.env['FIREBASE_SERVICE_ACCOUNT_PATH'];

    if (serviceAccountPath) {
      const { readFileSync } = await import('node:fs');
      const serviceAccount = JSON.parse(
        readFileSync(serviceAccountPath, 'utf-8'),
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } else {
      // Cloud Run: uses default credentials
      admin.initializeApp({ projectId });
    }
  }

  firebaseAdmin = admin;
  return admin;
}

// ── Token verifier ─────────────────────────────────
export async function verifyToken(token: string): Promise<AuthUser> {
  const admin = await getFirebaseAdmin();
  const decoded = await admin.auth().verifyIdToken(token);

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
      await getFirebaseAdmin();
      app.log.info('✅ Firebase Admin SDK initialized');
    } catch (err) {
      app.log.warn({ err }, '⚠️  Firebase Admin SDK init failed — auth will fail');
    }
  });
}

export const firebaseAuthPlugin = fp(firebaseAuthPluginFn, {
  name: 'firebase-auth',
});
