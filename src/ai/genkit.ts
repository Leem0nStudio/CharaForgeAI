import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as googleCloudPlugin from '@genkit-ai/google-cloud';

export const ai = genkit({
  plugins: [
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
    googleCloudPlugin.googleCloud(),
  ],
  logSinks: ['googlecloud'],
  traceSinks: ['googlecloud'],
  enableTracingAndMetrics: true,
});
