import mongoose, { Model, Schema } from 'mongoose';

export interface ISignal {
  timestamp: Date;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  closePrice: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  executed: boolean;
  orderId?: string;
}

const SignalSchema = new Schema<ISignal>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    symbol: { type: String, required: true },
    signal: { type: String, enum: ['BUY', 'SELL', 'HOLD'], required: true },
    closePrice: { type: Number, required: true },
    rsi: { type: Number, required: true },
    macd: { type: Number, required: true },
    macdSignal: { type: Number, required: true },
    executed: { type: Boolean, default: false },
    orderId: { type: String },
  },
  {
    timestamps: true,
  }
);

SignalSchema.index({ timestamp: -1 });
SignalSchema.index({ symbol: 1, timestamp: -1 });

export const Signal: Model<ISignal> =
  mongoose.models.Signal || mongoose.model<ISignal>('Signal', SignalSchema);
