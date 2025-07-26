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

  // To save a new created design 
  createCustomProduct(data: CustomProductRequest): Observable<CustomProductResponse> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<CustomProductResponse>(`${this.api}/Products/Custom`, data, { headers });
  }

  // To save a new design created by a seller
  createTemplateFromDesign(data: ProductTemplateRequest): Observable<ProductTemplateResponse> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<ProductTemplateResponse>(`${this.api}/Products/Templates`, data, { headers });
  }
  
  // To upload an image
  uploadImage(imageBlob: Blob): Observable<any> {
    const token = this.auth.getToken();

    const formData = new FormData();
    const filename = `design-${Date.now()}.jpg`;

    formData.append('file', imageBlob, filename);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<any>(`${this.api}/Files/UploadImage`, formData, { headers });
  }
}