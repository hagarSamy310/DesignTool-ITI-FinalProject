import { CustomProductResponse } from './product.model';
export interface AddToCartRequest {
  "customProductId": number,
  "quantity": number
}

export interface CartItemResponse {
  cartItemId: number
  customProductId: number
  quantity: number
  addedAt: string
  customProduct: CustomProductResponse
}