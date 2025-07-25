import { Injectable, signal, computed } from '@angular/core';
import { CanvasState } from '../../models/design.model';

@Injectable({ providedIn: 'root' })
export class DesignHistoryService {
  private history = signal<CanvasState[]>([]);
  private currentIndex = signal(-1);
  private maxHistorySize = 50;

  canUndo = computed(() => this.currentIndex() > 0);
  canRedo = computed(() => this.currentIndex() < this.history().length - 1);

  saveState(canvasState: CanvasState): void {
    const current = this.history();
    const index = this.currentIndex();
    
    // Remove any states after current index (when user makes new action after undo)
    const newHistory = current.slice(0, index + 1);
    
    // Add new state
    newHistory.push({ ...canvasState, version: Date.now().toString() });
    
    // Limit history size
    if (newHistory.length > this.maxHistorySize) {
      newHistory.shift();
    } else {
      this.currentIndex.update(i => i + 1);
    }
    
    this.history.set(newHistory);
  }

  undo(): CanvasState | null {
    if (!this.canUndo()) return null;
    
    this.currentIndex.update(i => i - 1);
    return this.history()[this.currentIndex()];
  }

  redo(): CanvasState | null {
    if (!this.canRedo()) return null;
    
    this.currentIndex.update(i => i + 1);
    return this.history()[this.currentIndex()];
  }

  clear(): void {
    this.history.set([]);
    this.currentIndex.set(-1);
  }

  getCurrentState(): CanvasState | null {
    const index = this.currentIndex();
    return index >= 0 ? this.history()[index] : null;
  }
}