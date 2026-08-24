import { Router } from 'express';

import { getHealth } from '../controllers/health.controller';
import { loginController } from '../controllers/auth.controller';

export const apiRouter = Router();

apiRouter.get('/health', getHealth);
apiRouter.post('/auth/login', loginController);