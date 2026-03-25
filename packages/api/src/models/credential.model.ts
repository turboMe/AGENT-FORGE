import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import type { ICredential } from '@agentforge/shared';

export interface ICredentialDocument extends Omit<ICredential, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const CredentialSchema = new Schema<ICredentialDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    service: { type: String, required: true },
    encryptedKey: { type: String, required: true },
    iv: { type: String, required: true },
    maskedKey: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const CredentialModel = mongoose.model<ICredentialDocument>(
  'Credential',
  CredentialSchema
);
