// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof Image !== 'undefined';

// Simple image cache to avoid repeated network requests
class ImageCache {
  private cache = new Map<string, HTMLImageElement>();
  private loading = new Set<string>();

  async preloadImage(url: string): Promise<HTMLImageElement> {
    // Return early if not in browser environment
    if (!isBrowser) {
      return Promise.reject(
        new Error('Image preloading not available during SSR')
      );
    }

    // Return cached image if available
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Return existing promise if already loading
    if (this.loading.has(url)) {
      return new Promise((resolve, reject) => {
        const checkCache = () => {
          if (this.cache.has(url)) {
            resolve(this.cache.get(url)!);
          } else if (!this.loading.has(url)) {
            reject(new Error('Image failed to load'));
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    // Start loading the image
    this.loading.add(url);

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.cache.set(url, img);
        this.loading.delete(url);
        resolve(img);
      };

      img.onerror = () => {
        this.loading.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      // Don't set crossOrigin to avoid CORS issues with external images
      img.src = url;
    });
  }

  async preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
    // Return empty array if not in browser environment
    if (!isBrowser) {
      return Promise.resolve([]);
    }

    return Promise.allSettled(urls.map(url => this.preloadImage(url))).then(
      results =>
        results
          .filter(
            (result): result is PromiseFulfilledResult<HTMLImageElement> =>
              result.status === 'fulfilled'
          )
          .map(result => result.value)
    );
  }

  getCachedImage(url: string): HTMLImageElement | null {
    // Return null if not in browser environment
    if (!isBrowser) {
      return null;
    }
    return this.cache.get(url) || null;
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const imageCache = new ImageCache();
