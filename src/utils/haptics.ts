export const triggerHaptic = (pattern: number | number[] = 50) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors if blocked by iframe permissions or unsupported browser
    }
  }
};

export const hapticPatterns = {
  success: [40, 50, 40],
  sync: [30, 40, 30, 40],
  click: 30,
  error: [100, 50, 100],
};
