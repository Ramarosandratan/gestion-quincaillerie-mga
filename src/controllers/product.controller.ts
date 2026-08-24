import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../types/api';
import { addStock, adjustStock, createProduct, deactivateProduct, getProduct, listCriticalProducts, listProducts, searchProducts, updateProduct } from '../services/product.service';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';

function idFromRequest(request: Request): number {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'INVALID_PRODUCT_ID', 'L’identifiant du produit est invalide.');
  return id;
}

export async function getProducts(_request: Request, response: Response, next: NextFunction) {
  try { response.json({ success: true, data: await listProducts() }); } catch (error) { next(error); }
}

export async function getProductById(request: Request, response: Response, next: NextFunction) {
  try { response.json({ success: true, data: await getProduct(idFromRequest(request)) }); } catch (error) { next(error); }
}

export async function searchProductList(request: Request, response: Response, next: NextFunction) {
  const query = typeof request.query.q === 'string' ? request.query.q : '';
  try { response.json({ success: true, data: await searchProducts(query) }); } catch (error) { next(error); }
}

export async function getProductAlerts(_request: Request, response: Response, next: NextFunction) {
  try { response.json({ success: true, data: await listCriticalProducts() }); } catch (error) { next(error); }
}

export async function postProduct(request: Request, response: Response, next: NextFunction) {
  try { response.status(201).json({ success: true, data: await createProduct(request.body) }); } catch (error) { next(error); }
}

export async function putProduct(request: Request, response: Response, next: NextFunction) {
  try { response.json({ success: true, data: await updateProduct(idFromRequest(request), request.body) }); } catch (error) { next(error); }
}

export async function deleteProduct(request: Request, response: Response, next: NextFunction) {
  try { response.json({ success: true, data: await deactivateProduct(idFromRequest(request)) }); } catch (error) { next(error); }
}

export async function postStockEntry(request: Request, response: Response, next: NextFunction) {
  try { response.status(201).json({ success: true, data: await addStock(request.body, Number((request as AuthenticatedRequest).user?.sub)) }); } catch (error) { next(error); }
}

export async function postStockAdjustment(request: Request, response: Response, next: NextFunction) {
  try { response.status(201).json({ success: true, data: await adjustStock(request.body, Number((request as AuthenticatedRequest).user?.sub)) }); } catch (error) { next(error); }
}