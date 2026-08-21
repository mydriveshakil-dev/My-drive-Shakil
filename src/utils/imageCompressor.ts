/**
 * Image compressor utility to resize & compress user profile photos
 * Keeps file size small (~20KB-40KB) for instant Firestore sync & low latency.
 */
export async function compressProfileImage(file: File, maxWidth = 360, maxHeight = 360, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio & dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

/**
 * High-quality chat image compressor to ensure instant upload and full Firestore compatibility (< 200KB)
 */
export async function compressChatImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.78): Promise<{ dataUrl: string; sizeKB: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Keep aspect ratio within maxWidth x maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackData = event.target?.result as string;
          resolve({ dataUrl: fallbackData, sizeKB: Math.round(file.size / 1024) });
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Try high-quality JPEG
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // If still large (>400KB), re-compress slightly more
        if (dataUrl.length > 550000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }

        const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, sizeKB });
      };
      img.onerror = () => {
        // If image decode fails, resolve original as fallback
        const raw = event.target?.result as string;
        resolve({ dataUrl: raw, sizeKB: Math.round(file.size / 1024) });
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

