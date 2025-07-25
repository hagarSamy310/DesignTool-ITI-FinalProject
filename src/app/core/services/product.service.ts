import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import {
 ProductsTemplatesResponse,
  CustomProductRequest,
  CustomProductResponse,
  ProductTemplateRequest,
  ProductTemplateResponse
} from '../../models/product.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = environment.apiUrl;

  // To get all the available templates
  getTemplates(): Observable<ProductsTemplatesResponse[]> {
    return this.http.get<ProductsTemplatesResponse[]>(`${this.api}/Products/PublicTemplates`);
  }

  // To sava a new created design 
  createCustomProduct(data: CustomProductRequest): Observable<CustomProductResponse> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<CustomProductResponse>(`${this.api}/Products/Custom`, data, { headers });
  }
  // To fetch an existing saved design by its ID (for editing)
   getCustomProduct(id: string): Observable<CustomProductResponse> {
    return this.http.get<CustomProductResponse>(`${this.api}/Products/Custom/${id}`);
  }

  // To save a new design created by a seller
  createTemplateFromDesign(data: ProductTemplateRequest): Observable<ProductTemplateResponse> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<ProductTemplateResponse>(`${this.api}/Products/Templates`, data, { headers });
  }
  // To fetch a seller's created template by its ID (for editing)
  getTemplateById(id: number): Observable<ProductTemplateResponse> {
    return this.http.get<ProductTemplateResponse>(`${this.api}/Products/Templates/${id}`);
  }
}
