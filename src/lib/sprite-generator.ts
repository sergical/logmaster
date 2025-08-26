// Sprite generator for creating retro pixel art programmatically
export class SpriteGenerator {
  static generatePixelArt(type: string, size: number = 32): string {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Enable pixelated rendering
    ctx.imageSmoothingEnabled = false;
    
    switch (type) {
      case 'log':
        this.drawLog(ctx, size);
        break;
      case 'axe':
        this.drawAxe(ctx, size);
        break;
      case 'player':
        this.drawPlayer(ctx, size);
        break;
      case 'powerup':
        this.drawPowerUp(ctx, size);
        break;
      case 'particle':
        this.drawParticle(ctx, size);
        break;
    }
    
    return canvas.toDataURL();
  }
  
  private static drawLog(ctx: CanvasRenderingContext2D, size: number) {
    const pixelSize = size / 8;
    
    // Wood grain pattern
    const colors = ['#8B4513', '#A0522D', '#D2691E'];
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
    
    // Dark outline
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = pixelSize / 2;
    ctx.strokeRect(0, 0, size, size);
  }
  
  private static drawAxe(ctx: CanvasRenderingContext2D, size: number) {
    const pixelSize = size / 8;
    
    // Handle
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(3 * pixelSize, 4 * pixelSize, 2 * pixelSize, 4 * pixelSize);
    
    // Blade
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(2 * pixelSize, 0, 4 * pixelSize, 3 * pixelSize);
    
    // Blade edge
    ctx.fillStyle = '#808080';
    ctx.fillRect(2 * pixelSize, 2 * pixelSize, 4 * pixelSize, pixelSize);
  }
  
  private static drawPlayer(ctx: CanvasRenderingContext2D, size: number) {
    const pixelSize = size / 8;
    
    // Head
    ctx.fillStyle = '#FDBCB4';
    ctx.fillRect(3 * pixelSize, pixelSize, 2 * pixelSize, 2 * pixelSize);
    
    // Hat
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(2 * pixelSize, 0, 4 * pixelSize, pixelSize);
    
    // Body
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(2 * pixelSize, 3 * pixelSize, 4 * pixelSize, 3 * pixelSize);
    
    // Arms
    ctx.fillStyle = '#FDBCB4';
    ctx.fillRect(pixelSize, 3 * pixelSize, pixelSize, 2 * pixelSize);
    ctx.fillRect(6 * pixelSize, 3 * pixelSize, pixelSize, 2 * pixelSize);
    
    // Legs
    ctx.fillStyle = '#000080';
    ctx.fillRect(2 * pixelSize, 6 * pixelSize, 2 * pixelSize, 2 * pixelSize);
    ctx.fillRect(4 * pixelSize, 6 * pixelSize, 2 * pixelSize, 2 * pixelSize);
  }
  
  private static drawPowerUp(ctx: CanvasRenderingContext2D, size: number) {
    const pixelSize = size / 8;
    
    // Star shape
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(4 * pixelSize, 0, pixelSize, size);
    ctx.fillRect(0, 4 * pixelSize, size, pixelSize);
    ctx.fillRect(2 * pixelSize, 2 * pixelSize, 4 * pixelSize, 4 * pixelSize);
    
    // Center gem
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(3 * pixelSize, 3 * pixelSize, 2 * pixelSize, 2 * pixelSize);
  }
  
  private static drawParticle(ctx: CanvasRenderingContext2D, size: number) {
    const colors = ['#FFD700', '#FFA500', '#FF4500', '#FFFF00'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(0, 0, size, size);
  }
}

// Retro color palettes
export const RETRO_PALETTES = {
  arcade: {
    background: '#0f380f',
    primary: '#9bbc0f',
    secondary: '#8bac0f',
    highlight: '#306230',
  },
  neon: {
    background: '#1a0033',
    primary: '#ff006e',
    secondary: '#ff7700',
    highlight: '#00ffff',
  },
  forest: {
    background: '#2d1b00',
    primary: '#4a7c59',
    secondary: '#8fbc8f',
    highlight: '#ffd700',
  },
};
