import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { NgIf, NgFor, NgOptimizedImage } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { fabric } from 'fabric';

// Core services
import { ProductService } from './core/services/product.service';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { DesignHistoryService } from './core/services/design-history.service';

// Models and interfaces
import {
  ProductsTemplatesResponse,
  CustomProductRequest,
  ProductTemplateRequest,
} from './models/product.model';
import { EnhancedProductTemplate, CanvasState } from './models/design.model';

@Component({
  selector: 'app-design-tool',
  standalone: true,
  imports: [NgIf, NgFor, NgOptimizedImage],
  templateUrl: './design-tool.component.html',
  styleUrls: ['./design-tool.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignToolComponent implements AfterViewInit {
  // Service Injections
  private productService = inject(ProductService);
  private auth = inject(AuthService);
  private cartService = inject(CartService);
  private historyService = inject(DesignHistoryService);

  // Core Design State
  templates = signal<ProductsTemplatesResponse[]>([]);
  selectedTemplate = signal<EnhancedProductTemplate | null>(null);
  canvas = signal<fabric.Canvas | null>(null);

  // UI/UX State
  isLoading = signal(true);
  isSaving = signal(false);
  saveMessage = signal<string>('');
  showClearConfirm = signal(false);
  showBackgroundPanel = signal(false);
  showStickerPanel = signal(false);

  // Computed & Derived State
  isUser = computed(() => this.auth.isUser());
  isSeller = computed(() => this.auth.isSeller());
  canUndo = this.historyService.canUndo;
  canRedo = this.historyService.canRedo;

  // Internal State Properties
  private backgroundObjects: fabric.Image[] = [];
  private pendingTemplate: ProductsTemplatesResponse | null = null;

  // Static Data for UI
  backgrounds = [
    { name: 'Gradient Blue', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=500&h=600&fit=crop' },
    { name: 'Gradient Purple', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=500&h=600&fit=crop' },
    { name: 'Abstract Orange', url: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=500&h=600&fit=crop' },
    { name: 'Geometric Pattern', url: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=500&h=600&fit=crop' },
    { name: 'Watercolor', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&h=600&fit=crop' },
  ];

  stickers = [
    { name: 'Heart', url: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' },
    { name: 'Star', url: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' },
    { name: 'Smile', url: 'https://cdn-icons-png.flaticon.com/512/742/742751.png' },
    { name: 'Crown', url: 'https://cdn-icons-png.flaticon.com/512/2797/2797387.png' },
    { name: 'Lightning', url: 'https://cdn-icons-png.flaticon.com/512/1807/1807370.png' },
    { name: 'Diamond', url: 'https://cdn-icons-png.flaticon.com/512/2697/2697432.png' },
    { name: 'Flower', url: 'https://cdn-icons-png.flaticon.com/512/2909/2909582.png' },
    { name: 'Music Note', url: 'https://cdn-icons-png.flaticon.com/512/727/727218.png' },
    { name: 'Cloud', url: 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png' },
    { name: 'Fire', url: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' },
    { name: 'Chat GPT', url:'https://img.icons8.com/?size=100&id=bqBDyembTAOT&format=png&color=000000'},
    { name: 'AI', url:'https://img.icons8.com/?size=100&id=BU7Clwq5bV9D&format=png&color=000000'},
    { name: 'Stitch', url: 'https://img.icons8.com/?size=100&id=3IzQhyHba0Dz&format=png&color=000000' },
    { name: 'Simpson', url: 'https://img.icons8.com/?size=100&id=zPcW8v8lOCVi&format=png&color=000000'},
    { name: 'Pinterst', url: 'https://img.icons8.com/?size=100&id=XCx1x46OFpdU&format=png&color=000000' },
    { name: 'Instagram', url: 'https://img.icons8.com/?size=100&id=Plswr633TJUP&format=png&color=000000' },
    { name: 'TikTok', url: 'https://img.icons8.com/?size=100&id=TDvCl4bDEGpX&format=png&color=000000' },
    { name: 'LipGloss', url: 'https://img.icons8.com/?size=100&id=gJR5E8y5XQDU&format=png&color=000000' },
    { name: 'Lipstick', url: 'https://img.icons8.com/?size=100&id=m3RLbKnJ5tbE&format=png&color=000000' },
    { name: 'Nailpolish', url: 'https://img.icons8.com/?size=100&id=uGDQHJi37azW&format=png&color=000000' },
    { name: 'Mirror', url: 'https://img.icons8.com/?size=100&id=wBrQJ41DQsu8&format=png&color=000000' },
    { name: 'Spa Flower', url: 'https://img.icons8.com/?size=100&id=EvA5qGNroiJ1&format=png&color=000000' },
    { name: 'Owl', url: 'https://img.icons8.com/?size=100&id=lrSRHnxYFj2O&format=png&color=000000' },
    { name: 'Peace Pigeon', url: 'https://img.icons8.com/?size=100&id=9CpAH3rgRXJF&format=png&color=000000' },
    { name: 'Blue Bird', url: 'https://img.icons8.com/?size=100&id=qTxbyl0tqoKL&format=png&color=000000' },
    { name: 'Pinguin', url: 'https://img.icons8.com/?size=100&id=IOGcO7yy74QX&format=png&color=000000' },
    { name: 'Unicorn', url: 'https://img.icons8.com/?size=100&id=1t3xsvmGzWcV&format=png&color=000000' },
    { name: 'Butterfly', url: 'https://img.icons8.com/?size=100&id=awWpFSK2hRXy&format=png&color=000000' },
    { name: 'Cat', url: 'https://img.icons8.com/?size=100&id=tvJZdxwTxU5v&format=png&color=000000' },
    { name: 'Cat footprint', url: 'https://img.icons8.com/?size=100&id=yln7W1tiSYJz&format=png&color=000000' },
    { name: 'Dolphin', url: 'https://img.icons8.com/?size=100&id=WctFZL2PrzGq&format=png&color=000000' },
    { name: 'Heart with pulse', url: 'https://img.icons8.com/?size=100&id=q9vuKXGNoM3C&format=png&color=000000' },   
    { name: 'Strawberry', url: 'https://img.icons8.com/?size=100&id=Imhl4M7PRLx4&format=png&color=000000' },
    { name: 'Cherry', url: 'https://img.icons8.com/?size=100&id=hWF5Pjaba7qn&format=png&color=000000' },
    { name: 'Icecream', url: 'https://img.icons8.com/?size=100&id=WmlKheYYlgmD&format=png&color=000000' },
    { name: 'Pizza', url: 'https://img.icons8.com/?size=100&id=RTFOTVPzEAwT&format=png&color=000000' },
    { name: 'Watermelon', url: 'https://img.icons8.com/?size=100&id=Iclk9gpgVzi5&format=png&color=000000' },
    { name: 'Watermelon 2', url: 'https://img.icons8.com/?size=100&id=gIzaNVp2U2Fd&format=png&color=000000' },
    {name: 'Plestine', url: 'https://img.icons8.com/?size=100&id=8Op1Hgv1SttF&format=png&color=000000'}
  ];

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
    // Dispose of any existing canvas instance to prevent memory leaks on re-initialization.
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

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Handles Ctrl+Z for Undo and Ctrl+Y / Ctrl+Shift+Z for Redo.
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

  // Loads a selected product template onto the canvas.
  loadTemplate(template: ProductsTemplatesResponse) {
    const canvas = this.canvas();
    if (canvas && canvas.getObjects().length > 0 && this.selectedTemplate() !== null) {
      this.pendingTemplate = template;
      this.showClearConfirm.set(true);
      return;
    }

    this.selectedTemplate.set(template);

    // Use setTimeout to ensure the canvas element is available in the DOM after state change.
    setTimeout(() => {
      const canvasEl = document.getElementById('design-canvas') as HTMLCanvasElement;
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
          
          let areas: { x: number, y: number, width: number, height: number }[] = [];

          switch (template.productTemplateId) {
            case 1: // T-shirt
              areas = [{ x: 180, y: 200, width: 150, height: 200 }];
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
              areas = [{ x: 108, y: 180, width: 190, height: 250 }];
              break;
            case 7: // Phone Case
              areas = [{ x: 160, y: 208, width: 180, height: 320 }];
              break;
          }

          this.drawPrintAreas(areas);
        },
        { crossOrigin: 'anonymous' }
      );
    });
  }

  // Draws the visual boundaries for printable areas on the canvas.
  drawPrintAreas(areas: { x: number; y: number; width: number; height: number }[]) {
    const canvas = this.canvas();
    if (!canvas) return;

    this.backgroundObjects = [];

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
        isPrintArea: true
      } as any);

      canvas.add(printArea);
      canvas.sendToBack(printArea);
    });

    canvas.renderAll();

    setTimeout(() => {
      this.saveCanvasState();
    }, 500);
  }

  // Adds a new textbox to the canvas.
  addText() {
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

  // Changes the color of the selected text object.
  changeTextColor(event: Event) {
    const input = event.target as HTMLInputElement;
    const color = input.value;

    const obj = this.canvas()?.getActiveObject();
    if (obj && 'set' in obj) {
      obj.set('fill', color);
      this.canvas()?.renderAll();
    }
  }

  // Changes the font family of the selected text object.
  changeFontFamily(select: HTMLSelectElement) {
    const font = select.value;
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      (obj as fabric.Textbox).set('fontFamily', font);
      this.canvas()?.renderAll();
    }
  }

  // Changes the font size of the selected text object.
  changeFontSize(select: HTMLSelectElement) {
    const size = parseInt(select.value, 10);
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      (obj as fabric.Textbox).set('fontSize', size);
      this.canvas()?.renderAll();
    }
  }

  // Toggles bold style on the selected text object.
  toggleBold() {
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      const text = obj as fabric.Textbox;
      const current = text.get('fontWeight');
      text.set('fontWeight', current === 'bold' ? 'normal' : 'bold');
      this.canvas()?.renderAll();
    }
  }

  // Toggles italic style on the selected text object.
  toggleItalic() {
    const obj = this.canvas()?.getActiveObject();

    if (obj && (obj.type === 'textbox' || obj.type === 'text')) {
      const text = obj as fabric.Textbox;
      const current = text.get('fontStyle');
      text.set('fontStyle', current === 'italic' ? 'normal' : 'italic');
      this.canvas()?.renderAll();
    }
  }

  // Adds a rectangle shape to the canvas.
  addRectangle() {
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

  // Adds a circle shape to the canvas.
  addCircle() {
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

  // Adds a triangle shape to the canvas.
  addTriangle() {
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
  
  // Toggles the visibility of the background asset panel.
  toggleBackgroundPanel() {
    this.showBackgroundPanel.update(show => !show);
    this.showStickerPanel.set(false);
  }

  // Toggles the visibility of the sticker asset panel.
  toggleStickerPanel() {
    this.showStickerPanel.update(show => !show);
    this.showBackgroundPanel.set(false);
  }

  // Applies a background image, clipped to the defined print areas.
  setCanvasBackground(backgroundUrl: string): void {
    const canvas = this.canvas();
    const template = this.selectedTemplate();
    if (!canvas || !template) return;

    this.removeCanvasBackground();
    const printAreas = this.getPrintAreas(template.productTemplateId);

    fabric.Image.fromURL(
      backgroundUrl,
      (img) => {
        if (!img) return;
        printAreas.forEach((area, index) => {
          img.clone((clonedImg: fabric.Image) => {
            const scale = Math.max(area.width / clonedImg.width!, area.height / clonedImg.height!);
            const offsetX = (clonedImg.width! * scale - area.width) / 2;
            const offsetY = (clonedImg.height! * scale - area.height) / 2;

            clonedImg.set({
              left: area.x - offsetX,
              top: area.y - offsetY,
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false,
              isBackground: true,
              printAreaIndex: index
            } as any);

            clonedImg.clipPath = new fabric.Rect({
              left: area.x,
              top: area.y,
              width: area.width,
              height: area.height,
              absolutePositioned: true
            });

            canvas.add(clonedImg);
            canvas.sendToBack(clonedImg);
            this.backgroundObjects.push(clonedImg);
            canvas.renderAll();
          });
        });

        setTimeout(() => this.saveCanvasState(), 100);
      },
      { crossOrigin: 'anonymous' }
    );
  }

  // Removes all custom background images from the canvas.
  removeCanvasBackground(): void {
    const canvas = this.canvas();
    if (!canvas) return;

    this.backgroundObjects.forEach(bgObj => {
      canvas.remove(bgObj);
    });
    this.backgroundObjects = [];

    canvas.renderAll();
    this.saveCanvasState();
  }

  // Adds an image/sticker to the canvas.
  addStickerToCanvas(stickerUrl: string): void {
    const canvas = this.canvas();
    if (!canvas) return;

    fabric.Image.fromURL(
      stickerUrl,
      (img) => {
        if (!img) return;
        const maxSize = 100;
        const scale = Math.min(maxSize / img.width!, maxSize / img.height!);

        img.set({
          left: canvas.getWidth() / 2 - (img.width! * scale) / 2,
          top: canvas.getHeight() / 2 - (img.height! * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          evented: true
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        this.saveCanvasState();
      },
      { crossOrigin: 'anonymous' }
    );
  }

  // Handles user-uploaded files for the canvas background.
  onBackgroundImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.canvas()) return;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.setCanvasBackground(reader.result as string);
      input.value = '';
    };

    reader.readAsDataURL(file);
  }

  // Handles the general image upload for adding to the canvas as a movable object.
  onImageUpload(event: Event) {
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
          const maxWidth = canvas.getWidth() / 3; 
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

  // Deletes the currently active object.
  deleteActiveObject() {
    const canvas = this.canvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;

    if ((activeObject as any).isBackground) {
      this.removeCanvasBackground();
    } else {
      canvas.remove(activeObject);
      canvas.discardActiveObject();
    }
    canvas.renderAll();
    setTimeout(() => this.saveCanvasState(), 100);
  }

  // Initiates the canvas clearing process by showing a confirmation prompt.
  clearCanvas() {
    this.showClearConfirm.set(true);
  }

  // Confirms the clear action.
  confirmClearCanvas() {
    const canvas = this.canvas();
    if (!canvas) return;

    canvas.clear();
    this.showClearConfirm.set(false);

    if (this.pendingTemplate) {
      const templateToLoad = this.pendingTemplate;
      this.pendingTemplate = null;
      this.loadTemplate(templateToLoad);
      return;
    }

    const template = this.selectedTemplate();
    if (template) {
      this.loadTemplate(template);
    }
  }

  // Cancels the clear action.
  cancelClearCanvas() {
    this.pendingTemplate = null;
    this.showClearConfirm.set(false);
  }

  // Reverts the canvas to its previous state.
  undo() {
    const previousState = this.historyService.undo();
    if (previousState) {
      this.disableCanvasEvents();
      this.loadCanvasState(previousState);
    }
  }

  // Re-applies an undone canvas state.
  redo() {
    const nextState = this.historyService.redo();
    if (nextState) {
      this.disableCanvasEvents();
      this.loadCanvasState(nextState);
    }
  }

  // Saves the design as a public template (for sellers).
  async saveAsTemplate() {
    const canvas = this.canvas();
    const template = this.selectedTemplate();

    if (!canvas || !template) {
      this.saveMessage.set('Please select a template first');
      return;
    }

    if (!this.isSeller()) {
      this.saveMessage.set('Only sellers can create templates');
      return;
    }

    this.isSaving.set(true);
    this.saveMessage.set('Preparing your design...');

    try {
      const canvasJSON = JSON.stringify(canvas.toJSON(['id', 'selectable', 'evented', 'crossOrigin', 'src']));
      this.saveMessage.set('Converting design to image...');
      const imageBlob = await this.convertCanvasToBlob(canvas);

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageBlob.size > maxSize) {
        throw new Error(`Image is too large (${Math.round(imageBlob.size / 1024 / 1024)}MB). Please reduce canvas size or image quality.`);
      }

      this.saveMessage.set('Uploading image...');
      const response = await firstValueFrom(this.productService.uploadImage(imageBlob));
      const imageUrl = this.extractImageUrl(response);
      console.log('Image uploaded successfully:', imageUrl);

      this.saveMessage.set('Creating public product...');
      const productTemplate: ProductTemplateRequest = {
        name: `Template ${Date.now()}`,
        description: 'Custom product created by seller',
        basePrice: template.basePrice,
        category: template.category,
        imageUrl: imageUrl,
        elements: canvasJSON,
      };

      const templateResponse = await firstValueFrom(this.productService.createTemplateFromDesign(productTemplate));
      console.log('Template created:', templateResponse);
      this.saveMessage.set('Your product saved successfully! It\'s now available to all users.');

    } catch (error: any) {
      console.error('Failed to save product:', error);
      this.handleSaveError(error);
    }

    this.isSaving.set(false);
    setTimeout(() => this.saveMessage.set(''), 5000);
  }

  // Saves the design as a custom product and adds it to the user's cart.
  async addToCart() {
    const canvas = this.canvas();
    const template = this.selectedTemplate();

    if (!canvas || !template) {
      this.saveMessage.set('Please select a template first');
      return;
    }

    this.isSaving.set(true);
    this.saveMessage.set('Preparing design for cart...');

    try {
      const canvasJSON = JSON.stringify(canvas.toJSON(['id', 'selectable', 'evented', 'crossOrigin', 'src']));
      this.saveMessage.set('Converting design to image...');
      const imageBlob = await this.convertCanvasToBlob(canvas);

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageBlob.size > maxSize) {
        throw new Error(`Image is too large (${Math.round(imageBlob.size / 1024 / 1024)}MB). Please reduce canvas size or image quality.`);
      }

      this.saveMessage.set('Uploading image...');
      const response = await firstValueFrom(this.productService.uploadImage(imageBlob));
      const imageUrl = this.extractImageUrl(response);
      console.log('Image uploaded successfully:', imageUrl);

      this.saveMessage.set('Creating custom product...');
      const customProduct: CustomProductRequest = {
        productTemplateId: template.productTemplateId,
        customName: `My Custom Design ${Date.now()}`,
        customDescription: 'Custom design for personal use',
        customImageUrl: imageUrl,
        price: template.basePrice + 100,
        elements: canvasJSON,
      };

      const customProductResponse = await firstValueFrom(this.productService.createCustomProduct(customProduct));

      if (customProductResponse) {
        console.log('Custom product created:', customProductResponse);
        this.saveMessage.set('Adding to cart...');
        const cartItem = {
          customProductId: customProductResponse.customProductId,
          quantity: 1,
        };
        await firstValueFrom(this.cartService.addToCart(cartItem));
        this.saveMessage.set('Design added to your cart successfully!');
      }
    } catch (error: any) {
      console.error('Add to cart error:', error);
      this.handleSaveError(error);
    }

    this.isSaving.set(false);
    setTimeout(() => this.saveMessage.set(''), 5000);
  }

  // Helper to retrieve print area dimensions based on the template ID.
  private getPrintAreas(templateId: number): { x: number; y: number; width: number; height: number }[] {
    switch (templateId) {
      case 1: return [{ x: 180, y: 200, width: 150, height: 200 }];
      case 4: return [{ x: 41, y: 153, width: 59, height: 389 }, { x: 400, y: 153, width: 59, height: 389 }];
      case 5: return [{ x: 95, y: 250, width: 80, height: 100 }, { x: 328, y: 250, width: 80, height: 100 }];
      case 6: return [{ x: 108, y: 180, width: 190, height: 250 }];
      case 7: return [{ x: 160, y: 208, width: 180, height: 320 }];
      default: return [{ x: 100, y: 150, width: 300, height: 300 }];
    }
  }

  // Saves the current canvas state to the history service.
  private saveCanvasState() {
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
      objects: canvas.getObjects().map((obj) => obj.toObject(['id', 'selectable', 'evented'])),
      background: canvas.backgroundColor as string,
      backgroundImage: backgroundImageData,
      width: canvas.getWidth(),
      height: canvas.getHeight(),
    };

    this.historyService.saveState(canvasState);
  }

  // Loads a specific canvas state from the history.
  private loadCanvasState(state: CanvasState) {
    const canvas = this.canvas();
    if (!canvas) return;
    canvas.loadFromJSON({
        version: state.version,
        objects: state.objects,
        background: state.background,
        backgroundImage: state.backgroundImage,
      },
      () => {
        canvas.renderAll();
        setTimeout(() => { this.enableCanvasEvents(); }, 50);
      }
    );
  }

  // Sets up debounced event listeners for canvas changes.
  private setupCanvasEvents() {
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

  // Temporarily removes canvas event listeners.
  private disableCanvasEvents() {
    const canvas = this.canvas();
    if (!canvas) return;

    canvas.off('object:added');
    canvas.off('object:removed');
    canvas.off('object:modified');
  }

  // Re-enables canvas event listeners.
  private enableCanvasEvents() {
    this.setupCanvasEvents();
  }

  // Converts the current canvas view to a Blob for uploading.
  private async convertCanvasToBlob(canvas: fabric.Canvas): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      try {
        const printAreaObjects: fabric.Object[] = [];
        canvas.getObjects().forEach(obj => {
          if ((obj as any).isPrintArea) {
            printAreaObjects.push(obj);
            obj.set('visible', false);
          }
        });
        canvas.renderAll();

        const dataURL = canvas.toDataURL({
          format: 'jpeg',
          quality: 1.0,
          multiplier: 1.5
        });

        printAreaObjects.forEach(obj => {
          obj.set('visible', true);
        });
        canvas.renderAll();

        if (!dataURL || dataURL === 'data:,') {
          reject(new Error('Canvas produced empty data URL'));
          return;
        }

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

  // Extracts the image URL from various possible server response formats.
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

  // Handles and displays various save-related errors to the user.
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