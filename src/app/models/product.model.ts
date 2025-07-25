export interface ProductsTemplatesResponse  // Getting all the available templates  
{
  productTemplateId: number
  name: string | null
  description: string | null
  basePrice: number
  category: number
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  sellerProfileId: number
  elements: string | null 
}

// CustomProduct interfaces >> To save & get a custom design (for a normal user)
export interface CustomProductRequest{
  productTemplateId: number
  customName: string
  customDescription: string | null
  customImageUrl: string | null
  price: number
  elements: string | null
}

export interface CustomProductResponse {  
  customProductId: number
  customName: string | null
  customDescription: string | null
  customImageUrl: string | null
  price: number
  createdAt: string
  productTemplateId: number
  userId: string | null
  elements: string | null
}

// ProductTemplate interfaces >> To save & get (a template designed by  a seller)
export interface ProductTemplateRequest {
  name: string
  description: string | null
  basePrice: number
  category: number
  imageUrl: string | null
  elements: string | null
}
export interface ProductTemplateResponse {
  productTemplateId: number
  name: string | null
  description: string | null
  basePrice: number
  category: number
  imageUrl: string | null
  isActive: boolean
  createdAt: string
  sellerProfileId: number
  elements: string | null 
}
