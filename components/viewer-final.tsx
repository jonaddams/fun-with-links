'use client';
import { useRef, useEffect, useState } from 'react';

interface ViewerProps {
  document: string;
}

interface AnnotationPressEvent {
  annotation: {
    pageIndex: number;
    toJSON: () => {
      boundingBox?: {
        toJSON: () => any;
      };
    };
  };
  preventDefault?: () => void;
}

export default function Viewer({ document }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [currentSection, setCurrentSection] = useState<string>('');

  useEffect(() => {
    const container = containerRef.current;
    let observer: MutationObserver | null = null;

    const { NutrientViewer } = window;
    if (container && NutrientViewer) {
      const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || '';

      // Function to find section using contentDocument
      const findSectionForElement = (element: Element, contentDocument: any): string | null => {
        const allTextElements = Array.from(contentDocument.querySelectorAll('.PSPDFKit-Text'));

        const headings = allTextElements.filter((el: any) => {
          const text = el.textContent?.trim() || '';
          return /^\d+(\.\d+)*\.\s+/.test(text);
        });

        const elementRect = element.getBoundingClientRect();
        let closestHeading: Element | null = null;
        let smallestDistance = Infinity;

        for (const heading of headings) {
          const headingRect = (heading as Element).getBoundingClientRect();
          if (headingRect.top <= elementRect.top) {
            const distance = elementRect.top - headingRect.top;
            if (distance < smallestDistance) {
              smallestDistance = distance;
              closestHeading = heading as Element;
            }
          }
        }

        return closestHeading ? closestHeading.textContent?.trim() || null : null;
      };

      // Function to set up click detection using contentDocument
      const setupContentDocumentClickDetection = (contentDocument: any) => {
        console.log('Setting up click detection via contentDocument...');

        const checkForContent = () => {
          const textElements = contentDocument.querySelectorAll('.PSPDFKit-Text');
          console.log(`📝 Found ${textElements.length} text elements in contentDocument`);

          if (textElements.length > 0) {
            // Add click listener to the contentDocument
            contentDocument.addEventListener('click', (event: any) => {
              const target = event.target as Element;
              if (!target) return;

              console.log('🖱️ Click detected via contentDocument on:', target.tagName, target.className);

              let textElement = target;
              if (!textElement.classList.contains('PSPDFKit-Text')) {
                textElement = textElement.closest('.PSPDFKit-Text') || target;
              }

              if (textElement && textElement.classList.contains('PSPDFKit-Text')) {
                console.log('📝 Found PSPDFKit-Text element for click');
                const sectionName = findSectionForElement(textElement, contentDocument);
                if (sectionName) {
                  console.log('📍 User clicked in section:', sectionName);
                  setCurrentSection(sectionName);
                } else {
                  console.log('⚠️ Could not determine section for click');
                }
              }
            });
          } else {
            console.log('⏳ Content not loaded yet, retrying...');
            setTimeout(checkForContent, 1000);
          }
        };

        checkForContent();
      };

      // Start observing for PSPDFKit container
      observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.classList?.contains('PSPDFKit-Container')) {
                console.log('📦 PSPDFKit-Container detected');
              }
            }
          });
        });
      });

      observer.observe(container, { childList: true, subtree: true });

      // Load the viewer
      NutrientViewer.load({
        container,
        document,
        licenseKey: licenseKey,
        renderPageCallback: async function (ctx: any, pageIndex: number) {
          if (pageIndex === window.viewerInstance.totalPageCount - 1) {
            setLoaded(true);
          }
        },
      })
        .then(async (instance: any) => {
          window.viewerInstance = instance;
          console.log('✅ Viewer loaded successfully');

          // Set up click detection using contentDocument after a delay
          setTimeout(() => {
            console.log('🔍 Setting up click detection...');
            if (instance.contentDocument) {
              setupContentDocumentClickDetection(instance.contentDocument);
            } else {
              console.warn('⚠️ contentDocument not available');
            }
          }, 2000);

          // Set up annotation handler for TOC links
          instance.addEventListener('annotations.press', async (event: AnnotationPressEvent) => {
            if (event.annotation instanceof NutrientViewer.Annotations.LinkAnnotation) {
              event.preventDefault?.();
              const bbox = event.annotation?.toJSON()?.boundingBox?.toJSON() || null;
              const pageIndex = event.annotation.pageIndex;

              if (bbox && pageIndex !== null) {
                const rect = new NutrientViewer.Geometry.Rect(bbox);
                const rectList = NutrientViewer.Immutable.List([rect]);
                const text = await instance.getTextFromRects(pageIndex, rectList);

                console.log('🔗 TOC Link clicked:', text);

                // Clean and search for the content
                const cleanedText = text.replace(/\.+\s*\d+\s*$/, '').trim();
                console.log('🔍 Searching for:', cleanedText);

                const results = await instance.search(cleanedText);
                if (results.size > 1) {
                  const targetResult = results.toArray()[1];
                  const targetPageIndex = targetResult.toJSON().pageIndex;
                  const targetRect = targetResult.toJSON().rectsOnPage._tail.array[0];
                  instance.jumpToRect(targetPageIndex, targetRect);
                  console.log('🎯 Navigated to content on page:', targetPageIndex);
                } else if (results.size === 1) {
                  const targetResult = results.toArray()[0];
                  const targetPageIndex = targetResult.toJSON().pageIndex;
                  const targetRect = targetResult.toJSON().rectsOnPage._tail.array[0];
                  instance.jumpToRect(targetPageIndex, targetRect);
                  console.log('🎯 Navigated to content on page:', targetPageIndex);
                } else {
                  console.warn('❌ No search results found for:', cleanedText);
                }
              }
            }
          });
        })
        .catch((error: Error) => {
          console.error('❌ Error loading viewer:', error);
        });

      return () => {
        observer?.disconnect();
      };
    }
  }, [document]);

  console.log('🔄 Component render - currentSection:', currentSection);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {loaded && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
          <button style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
            Clicked: {currentSection && `${currentSection}`}
          </button>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
