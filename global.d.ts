import NutrientViewer, { PSPDFKit } from '@nutrient-sdk/viewer';

declare global {
  interface Window {
    // Nutrient Web SDK will be available on window.NutrientViewer once loaded
    NutrientViewer?: typeof NutrientViewer;
    PSPDFKit: typeof PSPDFKit;
    viewerInstance?: any;
  }
  // Define the type for the instance returned by NutrientViewer.load
  interface NutrientViewerInstance {
    [key: string]: any;
  }

  interface LinkAnnotationPressEvent {
    annotation: any;
    preventDefault: () => void;
  }

  interface NutrientViewerInstance {
    addEventListener: (eventType: string, callback: (event: LinkAnnotationPressEvent) => void) => void;
  }

  interface NutrientViewerAnnotations {
    LinkAnnotation: new (...args: any[]) => any;
  }

  interface NutrientViewerStatic {
    Annotations: NutrientViewerAnnotations;
  }

  interface ViewerProps {
    document: string;
  }
}
