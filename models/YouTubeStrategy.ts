import mongoose, { Model, Schema } from 'mongoose';

export interface IYouTubeStrategy {
  videoId: string;
  videoUrl: string;
  videoTitle?: string;
  videoChannel?: string;
  transcript: string;
  extractedStrategies: {
    name: string;
    description: string;
    indicators?: {
      type: string;
      parameters?: Record<string, any>;
    }[];
    entryConditions?: string[];
    exitConditions?: string[];
    riskManagement?: string[];
    timeframes?: string[];
  }[];
  extractedAt: Date;
  processed: boolean;
  metadata?: {
    duration?: number;
    viewCount?: number;
    publishedAt?: Date;
  };
}

const YouTubeStrategySchema = new Schema<IYouTubeStrategy>(
  {
    videoId: { type: String, required: true, unique: true },
    videoUrl: { type: String, required: true },
    videoTitle: { type: String },
    videoChannel: { type: String },
    transcript: { type: String, required: true },
    extractedStrategies: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        indicators: [
          {
            type: { type: String },
            parameters: { type: Schema.Types.Mixed },
          },
        ],
        entryConditions: [String],
        exitConditions: [String],
        riskManagement: [String],
        timeframes: [String],
      },
    ],
    extractedAt: { type: Date, required: true, default: Date.now },
    processed: { type: Boolean, default: false },
    metadata: {
      duration: Number,
      viewCount: Number,
      publishedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

YouTubeStrategySchema.index({ videoId: 1 }, { unique: true });
YouTubeStrategySchema.index({ extractedAt: -1 });
YouTubeStrategySchema.index({ processed: 1 });

export const YouTubeStrategy: Model<IYouTubeStrategy> =
  mongoose.models.YouTubeStrategy ||
  mongoose.model<IYouTubeStrategy>('YouTubeStrategy', YouTubeStrategySchema);

