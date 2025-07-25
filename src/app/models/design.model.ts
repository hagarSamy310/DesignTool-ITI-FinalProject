export interface DesignElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  fabricObject?: any;
  properties: {
    left: number;
    top: number;
    width?: number;
    height?: number;
    angle?: number;
    scaleX?: number;
    scaleY?: number;

    // Shared or Text-specific
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;

    // Image specific
    src?: string;

    // Shape specific
    stroke?: string;
    strokeWidth?: number;
    radius?: number;
  };

}

export interface CanvasState {
  version: string;
  objects: any[];
  background?: string;
  backgroundImage?: any;
  width: number;
  height: number;
}

export interface DesignPreset {
  name: string;
  width: number;
  height: number;
}

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

// Extend existing product models
export interface EnhancedProductTemplate extends ProductsTemplatesResponse {
  dimensions?: {
    width: number;
    height: number;
  };
  printAreas?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

import { ProductsTemplatesResponse } from './product.model';