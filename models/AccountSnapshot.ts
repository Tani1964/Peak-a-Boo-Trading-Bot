import mongoose, { Model, Schema } from 'mongoose';

export interface IAccountSnapshot {
  timestamp: Date;
  portfolioValue: number;
  cash: number;
  buyingPower: number;
  equity: number;
  dayTradeCount?: number;
  accountStatus: string;
}

const AccountSnapshotSchema = new Schema<IAccountSnapshot>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    portfolioValue: { type: Number, required: true },
    cash: { type: Number, required: true },
    buyingPower: { type: Number, required: true },
    equity: { type: Number, required: true },
    dayTradeCount: { type: Number },
    accountStatus: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

AccountSnapshotSchema.index({ timestamp: -1 });

export const AccountSnapshot: Model<IAccountSnapshot> =
  mongoose.models.AccountSnapshot ||
  mongoose.model<IAccountSnapshot>('AccountSnapshot', AccountSnapshotSchema);
