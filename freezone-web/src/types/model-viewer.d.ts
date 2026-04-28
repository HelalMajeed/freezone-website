import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'camera-controls'?: boolean;
        'auto-rotate'?: boolean;
        ar?: boolean;
        'ar-modes'?: string;
        'poster'?: string;
        'shadow-intensity'?: string;
        'environment-image'?: string;
        'exposure'?: string;
        'loading'?: string;
        'reveal'?: string;
        'style'?: React.CSSProperties;
      };
    }
  }
}
