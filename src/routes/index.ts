import { Router } from 'express';

import { getHealth } from '../controllers/health.controller';

export const apiRouter = Router();

apiRouter.get('/health', getHealth);