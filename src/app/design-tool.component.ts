import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgIf, NgFor, NgOptimizedImage } from '@angular/common';
import { ProductService } from './core/services/product.service';
import { AuthService } from './core/services/auth.service';
import { ProductsTemplatesResponse } from './models/product.model';
import { fabric } from 'fabric';
import { EnhancedProductTemplate } from './models/design.model';
import { HostListener } from '@angular/core';
import { CartService } from './core/services/cart.service';
import { DesignHistoryService } from './core/services/design-history.service';
import {
  CustomProductRequest,
  ProductTemplateRequest,
} from './models/product.model';
import { CanvasState } from './models/design.model';

import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-design-tool',
  standalone: true,
  imports: [NgIf, NgFor, NgOptimizedImage],
  templateUrl: './design-tool.component.html',
  styleUrls: ['./design-tool.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignToolComponent implements AfterViewInit {
  private productService = inject(ProductService);
  private auth = inject(AuthService);
  private cartService = inject(CartService);
  private historyService = inject(DesignHistoryService);

  templates = signal<ProductsTemplatesResponse[]>([]);
  selectedTemplate = signal<EnhancedProductTemplate | null>(null);
  canvas = signal<fabric.Canvas | null>(null);
  showClearConfirm = signal(false);
  isSaving = signal(false);
  saveMessage = signal<string>('');
  canUndo = this.historyService.canUndo;
  canRedo = this.historyService.canRedo;

  isLoading = signal(true);
  isUser = computed(() => this.auth.isUser());
  isSeller = computed(() => this.auth.isSeller());
  showClearConfirmSignal: any;
  pendingTemplate: ProductsTemplatesResponse | null = null;

  constructor() {
    this.productService.getTemplates().subscribe({
      next: (res) => {
        this.templates.set(res ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  ngAfterViewInit() {
    // Initialize the canvas after view is ready
    if (this.canvas()) {
      this.canvas()?.dispose();
      this.canvas.set(null);
    }
    const canvasInstance = new fabric.Canvas('design-canvas', {
      width: 500,
      height: 600,
    });
    this.canvas.set(canvasInstance);
  }

  loadTemplate(template: ProductsTemplatesResponse) {
    const canvas = this.canvas();
    if (
      canvas &&
      canvas.getObjects().length > 0 &&
      this.selectedTemplate() !== null
    ) {
      this.pendingTemplate = template;
      this.showClearConfirm.set(true);
      return;
    }

    this.selectedTemplate.set(template);

    setTimeout(() => {
      const canvasEl = document.getElementById(
        'design-canvas'
      ) as HTMLCanvasElement;
      if (!canvasEl) return;

      if (this.canvas()) {
        this.canvas()?.dispose();
        this.canvas.set(null);
      }

      const canvasInstance = new fabric.Canvas(canvasEl, {
        width: 500,
        height: 600,
      });

      this.canvas.set(canvasInstance);
      this.setupCanvasEvents();
      this.historyService.clear();

      const pngUrl = template.imageUrl ?? '';

      fabric.Image.fromURL(
        pngUrl,
        (img) => {
          canvasInstance.setBackgroundImage(
            img,
            canvasInstance.renderAll.bind(canvasInstance),
            {
              scaleX: canvasInstance.width! / img.width!,
              scaleY: canvasInstance.height! / img.height!,
            }
          );

          let areas = [
            { x: 100, y: 150, width: 300, height: 300 },
            { x: 100, y: 150, width: 300, height: 300 },
          ];

          switch (template.productTemplateId) {
            case 1: // T-shirt
              areas = [
                { x: 180, y: 200, width: 150, height: 200 },
              ];
              break;
            case 4: // pants
              areas = [
                { x: 41, y: 153, width: 59, height: 389 },
                { x: 400, y: 153, width: 59, height: 389 },
              ];
              break;
            case 5: // Hoodie
              areas = [
                { x: 95, y: 250, width: 80, height: 100 },
                { x: 328, y: 250, width: 80, height: 100 },
              ];
              break;
            case 6: // Mug
              areas = [
                { x: 108, y: 180, width: 190, height: 250 },
              ];
              break;
            case 7: // Phone Case
              areas = [
                { x: 160, y: 208, width: 180, height: 320 },
              ];
              break;
          }

          this.drawPrintAreas(areas);
        },
        { crossOrigin: 'anonymous' }
      );
    });
  }

  drawPrintAreas(areas: { x: number; y: number; width: number; height: number }[]
  ) {
    // Draws multiple print area rectangles on the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    areas.forEach((area) => {
      const printArea = new fabric.Rect({
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        fill: 'rgba(0,0,0,0.05)',
        stroke: 'grey',
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
      });

      canvas.add(printArea);
      canvas.sendToBack(printArea);
    });

    canvas.renderAll();

    // Save initial state after print areas are drawn
    setTimeout(() => {
      this.saveCanvasState();
    }, 500);
  }
  addText() {
    // Adds a textbox to the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    const text = new fabric.Textbox('Your Text Here', {
      left: 50,
      top: 50,
      fontSize: 24,
      fill: '#000',
      width: 200,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
  }

  changeTextColor(event: Event) {
    // Changes the color of the selected text object
    const input = event.target as HTMLInputElement;
    const color = input.value;

    const obj = this.canvas()?.getActiveObject();
    if (obj && 'set' in obj) {
      obj.set('fill', color);
      this.canvas()?.renderAll();
    }
  }

  changeFontFamily(select: HTMLSelectElement) {
    // Changes the font family of the selected text object
    const font = select.value;
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      (obj as fabric.Textbox).set('fontFamily', font);
      this.canvas()?.renderAll();
    }
  }

  changeFontSize(select: HTMLSelectElement) {
    // Changes the font size of the selected text object
    const size = parseInt(select.value, 10);
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      (obj as fabric.Textbox).set('fontSize', size);
      this.canvas()?.renderAll();
    }
  }

  toggleBold() {
    // Toggles bold style on the selected text object
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      const text = obj as fabric.Textbox;
      const current = text.get('fontWeight');
      text.set('fontWeight', current === 'bold' ? 'normal' : 'bold');
      this.canvas()?.renderAll();
    }
  }

  toggleItalic() {
    // Toggles italic style on the selected text object
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      const text = obj as fabric.Textbox;
      const current = text.get('fontStyle');
      text.set('fontStyle', current === 'italic' ? 'normal' : 'italic');
      this.canvas()?.renderAll();
    }
  }

  addRectangle() {
    // Adds a rectangle shape to the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: '#3498db',
      width: 150,
      height: 100,
      selectable: true,
    });

    canvas.add(rect);
  }

  addCircle() {
    // Adds a circle shape to the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      fill: '#e74c3c',
      radius: 50,
      selectable: true,
    });

    canvas.add(circle);
  }

  addTriangle() {
    // Adds a triangle shape to the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    const triangle = new fabric.Triangle({
      left: 100,
      top: 100,
      fill: '#2ecc71',
      width: 100,
      height: 100,
      selectable: true,
    });

    canvas.add(triangle);
  }

  addSticker(url: string): void {
    // Adds an image sticker to the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    fabric.Image.fromURL(
      url,
      (img) => {
        if (!img) return;

        const maxWidth = 200;
        const scaleFactor = img.width! > maxWidth ? maxWidth / img.width! : 1;

        img.set({
          left: canvas.getWidth() / 2 - (img.width! * scaleFactor) / 2,
          top: canvas.getHeight() / 2 - (img.height! * scaleFactor) / 2,
          scaleX: scaleFactor,
          scaleY: scaleFactor,
          selectable: true,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      },
      { crossOrigin: 'anonymous' }
    );
  }

  setBackground(url: string): void {
    // Sets the background image of the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    fabric.Image.fromURL(
      url,
      (img) => {
        if (!img) return;

        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();

        const scaleX = canvasWidth / img.width!;
        const scaleY = canvasHeight / img.height!;
        const scale = Math.max(scaleX, scaleY);

        img.set({
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
        });

        canvas.setBackgroundImage(img, () => {
          canvas.renderAll();
        });
      },
      { crossOrigin: 'anonymous' }
    );
  }

  onImageUpload(event: Event) {
    // Handles image upload and adds it to the canvas
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.canvas()) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      fabric.Image.fromURL(
        reader.result as string,
        (img) => {
          if (!img) return;

          const canvas = this.canvas()!;
          const maxWidth = canvas.getWidth() / 2;
          const scaleFactor = img.width! > maxWidth ? maxWidth / img.width! : 1;

          img.set({
            left: canvas.getWidth() / 2 - (img.width! * scaleFactor) / 2,
            top: canvas.getHeight() / 2 - (img.height! * scaleFactor) / 2,
            scaleX: scaleFactor,
            scaleY: scaleFactor,
            selectable: true,
          });

          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        },
        { crossOrigin: 'anonymous' }
      );
    };

    reader.readAsDataURL(file);
    setTimeout(() => this.saveCanvasState(), 100);
  }

  deleteActiveObject() {
    // Deletes the currently selected object from the canvas
    const canvas = this.canvas();
    const activeObject = canvas?.getActiveObject();
    if (canvas && activeObject) {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
    setTimeout(() => this.saveCanvasState(), 100);
  }

  clearCanvas() {
    // Shows confirmation dialog before clearing the canvas
    this.showClearConfirm.set(true);
  }

  confirmClearCanvas() {
    // Clears the canvas and reloads template/background if needed
    const canvas = this.canvas();
    if (!canvas) return;

    canvas.clear();

    if (this.pendingTemplate) {
      const templateToLoad = this.pendingTemplate;
      this.pendingTemplate = null;
      this.showClearConfirm.set(false);
      this.loadTemplate(templateToLoad);
      return;
    }

    const template = this.selectedTemplate();
    if (template) {
      this.loadTemplate(template);
    }

    this.showClearConfirm.set(false);
  }

  cancelClearCanvas() {
    // Cancels the clear canvas confirmation dialog
    this.pendingTemplate = null;
    this.showClearConfirm.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Handles undo/redo keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
      } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
        event.preventDefault();
        this.redo();
      }
    }
  }
  private saveCanvasState() {
    // Saves the current canvas state to the history service
    const canvas = this.canvas();
    if (!canvas) return;

    const backgroundImage = canvas.backgroundImage;
    let backgroundImageData;

    if (typeof backgroundImage === 'string') {
      backgroundImageData = backgroundImage;
    } else if (backgroundImage && 'toObject' in backgroundImage) {
      backgroundImageData = backgroundImage.toObject();
    } else {
      backgroundImageData = null;
    }

    const canvasState: CanvasState = {
      version: Date.now().toString(),
      objects: canvas
        .getObjects()
        .map((obj) => obj.toObject(['id', 'selectable', 'evented'])),
      background: canvas.backgroundColor as string,
      backgroundImage: backgroundImageData,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
    };

    this.historyService.saveState(canvasState);
  }

  private loadCanvasState(state: CanvasState) {
    // Loads a canvas state from the history service
    const canvas = this.canvas();
    if (!canvas) return;

    canvas.loadFromJSON(
      {
        version: state.version,
        objects: state.objects,
        background: state.background,
        backgroundImage: state.backgroundImage,
      },
      () => {
        canvas.renderAll();
        setTimeout(() => {
          this.enableCanvasEvents();
        }, 50);
      }
    );
  }

  private setupCanvasEvents() {
    // Sets up debounced event listeners for canvas changes
    const canvas = this.canvas();
    if (!canvas) return;

    this.disableCanvasEvents();

    let saveTimeout: any;

    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => this.saveCanvasState(), 150);
    };

    canvas.on('object:added', debouncedSave);
    canvas.on('object:removed', debouncedSave);
    canvas.on('object:modified', debouncedSave);
  }

  private disableCanvasEvents() {
    // Removes event listeners from the canvas
    const canvas = this.canvas();
    if (!canvas) return;

    canvas.off('object:added');
    canvas.off('object:removed');
    canvas.off('object:modified');
  }

  private enableCanvasEvents() {
    // Re-enables canvas event listeners
    this.setupCanvasEvents();
  }

  undo() {
    // Undo the last canvas action
    const previousState = this.historyService.undo();
    if (previousState) {
      this.disableCanvasEvents();
      this.loadCanvasState(previousState);
    }
  }

  redo() {
    // Redo the last undone canvas action
    const nextState = this.historyService.redo();
    if (nextState) {
      this.disableCanvasEvents();
      this.loadCanvasState(nextState);
    }
  }

  // Save the current design or template
  async saveDesign() {
    const canvas = this.canvas();
    const template = this.selectedTemplate();

    if (!canvas || !template) {
      this.saveMessage.set('Please select a template first');
      return;
    }

    if (!this.auth.isLoggedIn()) {
      this.saveMessage.set('Please log in to save your design');
      return;
    }

    this.isSaving.set(true);
    this.saveMessage.set('Preparing design...');

    try {
      // Generate JSON data for editing 
      const canvasJSON = JSON.stringify(canvas.toJSON([
        'id', 'selectable', 'evented', 'crossOrigin', 'src'
      ]));

      this.saveMessage.set('Converting design to image...');

      // Convert Fabric.js canvas to blob
      const imageBlob = await this.convertCanvasToBlob(canvas);

      console.log('Canvas converted to blob:', {
        blobSize: imageBlob.size,
        blobType: imageBlob.type,
        canvasSize: `${canvas.getWidth()}x${canvas.getHeight()}`,
        elementsCount: canvas.getObjects().length
      });

      // Validate blob size (limit to 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageBlob.size > maxSize) {
        throw new Error(`Image is too large (${Math.round(imageBlob.size / 1024 / 1024)}MB). Please reduce canvas size or image quality.`);
      }

      // Upload image
      this.saveMessage.set('Uploading image...');
      const response = await firstValueFrom(
        this.productService.uploadImage(imageBlob)
      );

      // Extract image URL from response
      const imageUrl = this.extractImageUrl(response);
      console.log('Image uploaded successfully:', imageUrl);

      // Save the design data
      this.saveMessage.set('Saving design data...');

      if (this.isUser()) {
        await this.saveCustomProduct(template, imageUrl, canvasJSON);
      } else if (this.isSeller()) {
        await this.saveProductTemplate(template, imageUrl, canvasJSON);
      }

    } catch (error: any) {
      console.error('Save error:', error);
      this.handleSaveError(error);
    }

    this.isSaving.set(false);
    setTimeout(() => this.saveMessage.set(''), 5000);
  }

  // Helper method to convert Fabric.js canvas to blob
  private async convertCanvasToBlob(canvas: fabric.Canvas): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      try {
        const dataURL = canvas.toDataURL({
          format: 'jpeg',
          quality: 0.9,
          multiplier: 1
        });

        if (!dataURL || dataURL === 'data:,') {
          reject(new Error('Canvas produced empty data URL'));
          return;
        }

        // Convert data URL to blob
        fetch(dataURL)
          .then(res => res.blob())
          .then(blob => {
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert data URL to blob'));
            }
          })
          .catch(error => reject(error));

      } catch (error) {
        reject(new Error(`Canvas conversion failed: ${error}`));
      }
    });
  }

  // Extract image URL from server response
  private extractImageUrl(response: any): string {
    const url = response?.url ||
      response?.imageUrl ||
      response?.filePath ||
      response?.data?.url ||
      response?.data?.imageUrl ||
      response;

    if (typeof url === 'string' && url.length > 0) {
      return url;
    }

    throw new Error('Server response does not contain a valid image URL');
  }

  private async saveCustomProduct(template: any, imageUrl: string, canvasJSON: string) {
    const customProduct: CustomProductRequest = {
      productTemplateId: template.productTemplateId,
      customName: `Custom Design ${Date.now()}`,
      customDescription: 'Custom design created with design tool',
      customImageUrl: imageUrl,
      price: template.basePrice + 100,
      elements: canvasJSON,
    };

    console.log('Creating custom product:', {
      templateId: customProduct.productTemplateId,
      imageUrl: customProduct.customImageUrl,
      hasElements: !!customProduct.elements
    });

    const response = await firstValueFrom(
      this.productService.createCustomProduct(customProduct)
    );

    if (response) {
      console.log('Custom product created:', response);

      const cartItem = {
        customProductId: response.customProductId,
        quantity: 1,
      };

      console.log('Adding to cart:', cartItem);
      await firstValueFrom(this.cartService.addToCart(cartItem));

      this.saveMessage.set('Design saved and added to cart successfully!');
    }
  }

  private async saveProductTemplate(template: any, imageUrl: string, canvasJSON: string) {
    const productTemplate: ProductTemplateRequest = {
      name: `Template ${Date.now()}`,
      description: 'Custom template created by seller',
      basePrice: template.basePrice,
      category: template.category,
      imageUrl: imageUrl,
      elements: canvasJSON,
    };

    console.log('Creating template:', {
      name: productTemplate.name,
      imageUrl: productTemplate.imageUrl,
      hasElements: !!productTemplate.elements
    });

    const response = await firstValueFrom(
      this.productService.createTemplateFromDesign(productTemplate)
    );

    console.log('Template created:', response);
    this.saveMessage.set('Template saved successfully!');
  }

  private handleSaveError(error: any): void {
    console.error('Full error object:', error);

    if (error.message?.includes('Image upload failed') ||
      error.message?.includes('too large') ||
      error.message?.includes('Canvas')) {
      this.saveMessage.set(error.message);
    } else if (error.status === 0) {
      this.saveMessage.set('Network error. Please check your connection and try again.');
    } else if (error.status === 401) {
      this.saveMessage.set('Authentication failed. Please log in again.');
    } else if (error.status === 403) {
      this.saveMessage.set('You do not have permission to perform this action.');
    } else if (error.status === 500) {
      this.saveMessage.set('Server error. Please try again later.');
    } else {
      const isUser = this.isUser();
      const failedAction = isUser ? 'save design or add to cart' : 'save template';
      this.saveMessage.set(`Failed to ${failedAction}. Error: ${error.message || 'Unknown error'}`);
    }
  }
}
