import mongoose, { Model, Schema } from 'mongoose';

export interface ITrade {
  timestamp: Date;
  symbol: string;
  orderId?: string; // Optional - rejected trades won't have order IDs
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'blocked';
  filledAt?: Date;
  portfolioValue?: number;
  cash?: number;
  buyingPower?: number;
  equity?: number;
  totalValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  signalId?: string;
  rejectionReason?: string; // Reason why trade was rejected/blocked
}

const TradeSchema = new Schema<ITrade>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    symbol: { type: String, required: true },
    orderId: { type: String }, // Optional - rejected trades won't have order IDs
    side: { type: String, enum: ['buy', 'sell'], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'filled', 'cancelled', 'rejected', 'blocked'],
      default: 'pending',
    },
    filledAt: { type: Date },
    portfolioValue: { type: Number },
    cash: { type: Number },
    buyingPower: { type: Number },
    equity: { type: Number },
    totalValue: { type: Number },
    profitLoss: { type: Number },
    profitLossPercent: { type: Number },
    signalId: { type: String },
    rejectionReason: { type: String }, // Reason why trade was rejected/blocked
  },
  {
    timestamps: true,
  }
);

TradeSchema.index({ timestamp: -1 });
TradeSchema.index({ orderId: 1 }, { unique: true, sparse: true }); // Sparse index since orderId can be null
TradeSchema.index({ symbol: 1, timestamp: -1 });

export const Trade: Model<ITrade> =
  mongoose.models.Trade || mongoose.model<ITrade>('Trade', TradeSchema);
