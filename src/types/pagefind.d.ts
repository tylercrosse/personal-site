declare module '@pagefind/default-ui' {
  export class PagefindUI {
    constructor(options?: {
      element?: string;
      showImages?: boolean;
      showSubResults?: boolean;
      excerptLength?: number;
    });
  }
}

declare global {
  interface Window {
    pagefind?: {
      search(query: string): Promise<{
        results: Array<{
          data(): Promise<{
            url: string;
            excerpt: string;
            meta: {
              title?: string;
            };
          }>;
        }>;
      }>;
    };
  }
}

declare namespace App {
  interface Locals {
    figureCounter?: number;
  }
} 