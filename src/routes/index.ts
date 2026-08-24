import { Router } from 'express';

import { getHealth } from '../controllers/health.controller';
import { loginController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { deleteProduct, getProductAlerts, getProductById, getProducts, postProduct, postStockEntry, putProduct } from '../controllers/product.controller';

export const apiRouter = Router();

apiRouter.get('/health', getHealth);
apiRouter.post('/auth/login', loginController);

apiRouter.get('/produits', authMiddleware, getProducts);
apiRouter.get('/produits/alertes', authMiddleware, getProductAlerts);
apiRouter.get('/produits/:id', authMiddleware, getProductById);
apiRouter.post('/produits', authMiddleware, roleMiddleware(['ADMIN']), postProduct);
apiRouter.put('/produits/:id', authMiddleware, roleMiddleware(['ADMIN']), putProduct);
apiRouter.delete('/produits/:id', authMiddleware, roleMiddleware(['ADMIN']), deleteProduct);
apiRouter.post('/stocks/entree', authMiddleware, roleMiddleware(['ADMIN']), postStockEntry);