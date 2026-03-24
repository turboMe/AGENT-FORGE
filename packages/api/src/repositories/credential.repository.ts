import crypto from 'node:crypto';
import type { ICredential } from '@agentforge/shared';
import { CredentialModel } from '../models/credential.model.js';

// Lazy getter: reads env AFTER dotenv has loaded (ESM import ordering fix)
let _cachedKey: string | null = null;
function getEncryptionKey(): string {
  if (!_cachedKey) {
    const envKey = process.env['ENCRYPTION_KEY'];
    if (!envKey) {
      console.warn('[CredentialRepository] ⚠️  ENCRYPTION_KEY not set in .env — using random key (credentials will NOT survive restarts!)');
      _cachedKey = crypto.randomBytes(32).toString('hex');
    } else {
      _cachedKey = envKey;
    }
  }
  return _cachedKey;
}

function encrypt(text: string): { iv: string; encryptedData: string } {
  const iv = crypto.randomBytes(16);
  // Ensure key is 32 bytes
  const keyBuffer = Buffer.from(getEncryptionKey().padEnd(64, '0').slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
  };
}

function decrypt(ivHex: string, encryptedHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const keyBuffer = Buffer.from(getEncryptionKey().padEnd(64, '0').slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return '••••' + key.slice(-4);
}

export class CredentialRepository {
  /**
   * Create a new encrypted credential.
   */
  async create(data: { tenantId: string; userId: string; service: string; apiKey: string }): Promise<ICredential> {
    const { encryptedData, iv } = encrypt(data.apiKey);
    const maskedKey = maskKey(data.apiKey);

    const doc = await CredentialModel.create({
      tenantId: data.tenantId,
      userId: data.userId,
      service: data.service,
      encryptedKey: encryptedData,
      iv: iv,
      maskedKey: maskedKey,
    });

    return {
      _id: String(doc._id),
      tenantId: doc.tenantId,
      userId: doc.userId,
      service: doc.service,
      encryptedKey: doc.encryptedKey,
      iv: doc.iv,
      maskedKey: doc.maskedKey,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * List credentials for a tenant, stripped of actual encrypted keys for safety in summaries.
   */
  async findByTenant(tenantId: string): Promise<Omit<ICredential, 'encryptedKey' | 'iv'>[]> {
    const docs = await CredentialModel.find({ tenantId }).sort({ createdAt: -1 });
    return docs.map((doc) => ({
      _id: String(doc._id),
      tenantId: doc.tenantId,
      userId: doc.userId,
      service: doc.service,
      maskedKey: doc.maskedKey,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  /**
   * Delete a credential by ID
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await CredentialModel.deleteOne({ _id: id, tenantId });
    return result.deletedCount === 1;
  }

  /**
   * Retrieves to the plaintext API key securely, strictly for backend use.
   */
  async getDecryptedKey(tenantId: string, service: string): Promise<string | null> {
    const doc = await CredentialModel.findOne({ tenantId, service }).sort({ createdAt: -1 });
    if (!doc) return null;
    try {
      return decrypt(doc.iv, doc.encryptedKey);
    } catch (err) {
      console.error(`Failed to decrypt credential for tenant ${tenantId}, service ${service}:`, err);
      return null;
    }
  }
}
