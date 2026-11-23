import '@testing-library/jest-dom/vitest';

// jsdom has no canvas implementation: calling getContext() logs a
// "Not implemented" warning and returns null. Stub it to return null
// directly so tests rendering a <canvas> (the captcha) stay quiet; the
// component already handles a null context by drawing nothing.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
