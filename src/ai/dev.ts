import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-comic-panel-prompt.ts';
import '@/ai/flows/generate-comic-panel.ts';
import '@/ai/flows/regenerate-single-image.ts';
