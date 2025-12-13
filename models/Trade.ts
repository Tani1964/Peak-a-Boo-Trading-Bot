import mongoose, { Model, Schema } from 'mongoose';

export interface ITrade {
  timestamp: Date;
  symbol: string;
  orderId: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  filledAt?: Date;
  portfolioValue?: number;
  cash?: number;
}

const TradeSchema = new Schema<ITrade>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    symbol: { type: String, required: true },
    orderId: { type: String, required: true },
    side: { type: String, enum: ['buy', 'sell'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'filled', 'cancelled', 'rejected'],
      default: 'pending',
    },
    filledAt: { type: Date },
    portfolioValue: { type: Number },
    cash: { type: Number },
  },
  {
    timestamps: true,
  }
);

TradeSchema.index({ timestamp: -1 });
TradeSchema.index({ orderId: 1 }, { unique: true });
TradeSchema.index({ symbol: 1, timestamp: -1 });

export const Trade: Model<ITrade> =
  mongoose.models.Trade || mongoose.model<ITrade>('Trade', TradeSchema);
