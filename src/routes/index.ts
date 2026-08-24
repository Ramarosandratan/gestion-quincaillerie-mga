import { Router } from 'express';

import { getHealth } from '../controllers/health.controller';
import { loginController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { deleteProduct, getProductAlerts, getProductById, getProducts, postProduct, postStockAdjustment, postStockEntry, putProduct, searchProductList } from '../controllers/product.controller';
import { postSale } from '../controllers/sale.controller';
import { postClosure, postExpense, postSettlement } from '../controllers/treasury.controller';

export const apiRouter = Router();

apiRouter.get('/health', getHealth);
apiRouter.post('/auth/login', loginController);

apiRouter.get('/produits', authMiddleware, getProducts);
apiRouter.get('/produits/alertes', authMiddleware, getProductAlerts);
apiRouter.get('/produits/search', authMiddleware, searchProductList);
apiRouter.get('/produits/:id', authMiddleware, getProductById);
apiRouter.post('/produits', authMiddleware, roleMiddleware(['ADMIN']), postProduct);
apiRouter.put('/produits/:id', authMiddleware, roleMiddleware(['ADMIN']), putProduct);
apiRouter.delete('/produits/:id', authMiddleware, roleMiddleware(['ADMIN']), deleteProduct);
apiRouter.post('/stocks/entree', authMiddleware, roleMiddleware(['ADMIN']), postStockEntry);
apiRouter.post('/stocks/ajustement', authMiddleware, roleMiddleware(['ADMIN']), postStockAdjustment);
apiRouter.post('/ventes', authMiddleware, postSale);
apiRouter.post('/depenses', authMiddleware, postExpense);
apiRouter.post('/clients/:id/reglements', authMiddleware, postSettlement);
apiRouter.post('/caisse/cloture', authMiddleware, postClosure);