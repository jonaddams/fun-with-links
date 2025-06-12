'use client';

import React, { useEffect, useRef, useState } from 'react';

function cleanString(str: string): string {
  return str.replace(/(\.\s*|\s*\d+\s*)+$/, '').trim();
}

interface ViewerProps {
  document: string;
}

interface AnnotationPressEvent {
  annotation: any;
  preventDefault?: () => void;
}

export default function Viewer({ document }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pagesLoaded, setPagesLoaded] = useState<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    let observer: MutationObserver | null = null;
    let shadowObserver: MutationObserver | null = null;
    let shadowRoot: ShadowRoot | null = null;

    const { NutrientViewer } = window;
    if (container && NutrientViewer) {
      const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || '';

      // Function to find and scroll to content based on cleaned text
      const findAndScrollToContent = async (cleanedText: string, shadowRoot: ShadowRoot | null) => {
        let textElements: NodeListOf<Element>;

        if (shadowRoot) {
          console.log('📄 Searching shadow DOM for matching text...');
          // Focus on PSPDFKit-Text elements which contain the actual document text
          textElements = shadowRoot.querySelectorAll('.PSPDFKit-Text, span, div, p');
        } else {
          console.log('⚠️ Shadow root not available, falling back to contentDocument...');
          textElements = await window.viewerInstance.contentDocument.querySelectorAll('.PSPDFKit-Text, span, div, p');
        }

        // Find all elements that contain the cleaned text
        const matchingElements = Array.from(textElements).filter((element) => {
          const textContent = (element as Element)?.textContent?.trim();
          if (!textContent) return false;

          // Try different matching strategies
          return (
            textContent.includes(cleanedText) ||
            textContent.replace(/\s+/g, ' ').includes(cleanedText.replace(/\s+/g, ' ')) ||
            // Also try matching without periods and spaces for section numbers
            textContent.replace(/[.\s]/g, '').includes(cleanedText.replace(/[.\s]/g, ''))
          );
        });

        console.log(`🎯 Found ${matchingElements.length} matching elements for "${cleanedText}"`);

        if (matchingElements.length === 0) {
          console.log('❌ No matching content found, trying to load more content...');

          // Try to ensure all content is loaded
          if (shadowRoot) {
            await ensureContentLoaded(shadowRoot);

            // Try searching again after content loading
            const newTextElements = shadowRoot.querySelectorAll('.PSPDFKit-Text, span, div, p');
            const newMatchingElements = Array.from(newTextElements).filter((element) => {
              const textContent = (element as Element)?.textContent?.trim();
              if (!textContent) return false;

              return (
                textContent.includes(cleanedText) ||
                textContent.replace(/\s+/g, ' ').includes(cleanedText.replace(/\s+/g, ' ')) ||
                textContent.replace(/[.\s]/g, '').includes(cleanedText.replace(/[.\s]/g, ''))
              );
            });

            if (newMatchingElements.length > 0) {
              console.log(`🎯 Found ${newMatchingElements.length} matching elements after content loading`);
              const targetElement = newMatchingElements.length > 1 ? newMatchingElements[1] : newMatchingElements[0];
              scrollToElement(targetElement);
              return;
            }
          }
          console.log('❌ No matching content found, trying partial matches...');

          // Try partial matching for section headings
          const words = cleanedText.split(' ').filter((word) => word.length > 2);
          const partialMatches = Array.from(textElements).filter((element) => {
            const textContent = (element as Element)?.textContent?.trim();
            if (!textContent) return false;

            return words.some((word) => textContent.toLowerCase().includes(word.toLowerCase()));
          });

          if (partialMatches.length > 0) {
            console.log(`🎯 Found ${partialMatches.length} partial matches`);
            const targetElement = partialMatches[0] as Element;
            scrollToElement(targetElement);
            return;
          }

          alert(`No matching content found for "${cleanedText}"`);
          return;
        }

        // If multiple matches, prefer the one that's not in a table of contents area
        let targetElement: Element;

        if (matchingElements.length > 1) {
          // Look for the match that's likely to be the actual content (not TOC)
          // TOC elements are usually near the beginning of the document
          const sortedByPosition = matchingElements.sort((a, b) => {
            const aRect = a.getBoundingClientRect();
            const bRect = b.getBoundingClientRect();
            return aRect.top - bRect.top;
          });

          // Skip the first match if it looks like it might be a TOC entry
          targetElement = sortedByPosition.length > 1 ? sortedByPosition[1] : sortedByPosition[0];
        } else {
          targetElement = matchingElements[0] as Element;
        }

        scrollToElement(targetElement);
      };

      // Function to scroll to an element with proper viewport handling
      const scrollToElement = (element: Element) => {
        console.log('🎯 Scrolling to target element:', element);

        // Try to scroll the main viewport container
        const viewport = shadowRoot?.querySelector('.PSPDFKit-Scroll');
        if (viewport && element) {
          const elementRect = element.getBoundingClientRect();
          const viewportRect = viewport.getBoundingClientRect();

          // Calculate relative position within the scrollable container
          const scrollTop = viewport.scrollTop + (elementRect.top - viewportRect.top) - 100; // 100px offset for better visibility

          console.log(`📐 Scrolling viewport to position: ${scrollTop}`);
          viewport.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          });
        } else {
          // Fallback to regular scrollIntoView
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        }
      };

      // Function to set up annotation press handler
      const setupAnnotationHandler = () => {
        if (!window.viewerInstance) return;

        window.viewerInstance.addEventListener('annotations.press', async (event: AnnotationPressEvent) => {
          if (event.annotation instanceof NutrientViewer.Annotations.LinkAnnotation) {
            event.preventDefault?.();
            const bbox = event.annotation?.toJSON()?.boundingBox?.toJSON() || null;
            const pageIndex = event.annotation.pageIndex;

            if (bbox && pageIndex !== null) {
              const rect = new NutrientViewer.Geometry.Rect(bbox);
              const rectList = NutrientViewer.Immutable.List([rect]);
              const text = await window.viewerInstance.getTextFromRects(pageIndex, rectList);

              const cleanedText = cleanString(text);
              console.log('🔗 Link clicked:', cleanedText);

              // Search for matching content in the document
              await findAndScrollToContent(cleanedText, shadowRoot);
            }
          }
        });
      };

      // Function to set up click detection in shadow DOM
      const setupClickDetection = (detectedShadowRoot: ShadowRoot) => {
        console.log('Setting up click detection in shadow DOM...');

        // Add click event listener to the shadow root
        detectedShadowRoot.addEventListener('click', (event) => {
          const target = event.target as Element;
          if (!target) return;

          console.log('🖱️ Click detected in shadow DOM:', target);

          // Find the section this click belongs to
          const sectionName = findSectionForElement(target, detectedShadowRoot);
          if (sectionName) {
            console.log('📍 User clicked in section:', sectionName);
          } else {
            console.log('⚠️ Could not determine section for click');
          }
        });
      };

      // Function to find which section an element belongs to
      const findSectionForElement = (element: Element, shadowRoot: ShadowRoot): string | null => {
        // Get all text elements that might be section headings
        const allTextElements = shadowRoot.querySelectorAll('.PSPDFKit-Text');
        const headingElements: Element[] = [];

        // Filter for elements that look like section headings (contain numbers and periods)
        allTextElements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && /^\d+(\.\d+)*\.\s+/.test(text)) {
            headingElements.push(el);
          }
        });

        console.log(`Found ${headingElements.length} potential section headings`);

        // Get the clicked element's position
        const clickedRect = element.getBoundingClientRect();
        let closestSection: { element: Element; distance: number; text: string } | undefined;

        // Find the section heading that's closest above the clicked element
        headingElements.forEach((heading) => {
          const headingRect = heading.getBoundingClientRect();
          const text = heading.textContent?.trim() || '';

          // Check if this heading is above the clicked element
          if (headingRect.top <= clickedRect.top) {
            const distance = clickedRect.top - headingRect.top;

            if (!closestSection || distance < closestSection.distance) {
              closestSection = { element: heading, distance, text };
            }
          }
        });

        return closestSection?.text || null;
      };

      // Function to ensure content is loaded by scrolling through the document
      const ensureContentLoaded = async (shadowRoot: ShadowRoot) => {
        const viewport = shadowRoot.querySelector('.PSPDFKit-Scroll');
        if (!viewport) return;

        console.log('🔄 Ensuring all content is loaded...');

        // Get current scroll position
        const originalScrollTop = viewport.scrollTop;

        // Scroll to the bottom to trigger lazy loading
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' });

        // Wait a bit for content to load
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Scroll back to the original position
        viewport.scrollTo({ top: originalScrollTop, behavior: 'auto' });

        console.log('✅ Content loading triggered');
      };

      // Function to set up shadow DOM observer
      const setupShadowObserver = (detectedShadowRoot: ShadowRoot) => {
        console.log('Setting up shadow DOM observer...');
        shadowRoot = detectedShadowRoot; // Store reference for later use

        // Set up click detection
        setupClickDetection(detectedShadowRoot);

        shadowObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  // Check if the added element has the PSPDFKit-Text class
                  if (element.classList && element.classList.contains('PSPDFKit-Text')) {
                    console.log('PSPDFKit-Text element added to shadow DOM:', element);
                  }
                  // Also check if any child elements have the PSPDFKit-Text class
                  const textElements = element.querySelectorAll('.PSPDFKit-Text');
                  textElements.forEach((textElement) => {
                    console.log('PSPDFKit-Text element added to shadow DOM (nested):', textElement);
                  });
                }
              });
            }
          });
        });

        // Start observing the shadow root for changes
        shadowObserver.observe(detectedShadowRoot, {
          childList: true,
          subtree: true,
        });
      };

      // Options for the main observer (which mutations to observe)
      const config = { attributes: true, childList: true, subtree: true };

      // Callback function to execute when mutations are observed
      interface MutationCallback {
        (mutationList: MutationRecord[], observer: MutationObserver): void;
      }

      const mutationCallback: MutationCallback = (mutationList, observer) => {
        for (const mutation of mutationList) {
          if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.');
            if (mutation.addedNodes.length > 0) {
              console.log(`Added nodes: ${mutation.addedNodes.length}`);
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  if (element.className === 'PSPDFKit-Container') {
                    console.log('PSPDFKit-Container found:', element);

                    // Check if this element has a shadow root
                    if (element.shadowRoot) {
                      console.log('Shadow root found immediately');
                      setupShadowObserver(element.shadowRoot);
                    } else {
                      // Sometimes shadow root is attached later, so we need to check periodically
                      const checkForShadowRoot = () => {
                        if (element.shadowRoot) {
                          console.log('Shadow root found after delay');
                          setupShadowObserver(element.shadowRoot);
                        } else {
                          // Continue checking for a bit longer
                          setTimeout(checkForShadowRoot, 100);
                        }
                      };
                      setTimeout(checkForShadowRoot, 100);
                    }
                  }
                }
              });
            }
          } else if (mutation.type === 'attributes') {
            console.log(`The ${mutation.attributeName} attribute was modified.`);
          }
        }
      };

      // Create an observer instance linked to the callback function
      observer = new MutationObserver(mutationCallback);

      // Start observing the target node for configured mutations
      observer.observe(container, config);

      NutrientViewer.load({
        container,
        document,
        licenseKey: licenseKey,
        allowLinearizedLoading: false,
        renderPageCallback: async function (ctx: any, pageIndex: number) {
          // Simple page tracking
          setPagesLoaded(pageIndex + 1);

          if (pageIndex === window.viewerInstance.totalPageCount - 1) {
            console.log('renderPageCallback() last page rendered');
            if (!loaded) {
              setLoaded(true);
              setPageCount(window.viewerInstance.totalPageCount);
              console.log('All pages initially rendered, viewer ready');
              setupAnnotationHandler(); // Set up annotation handler when viewer is ready
            }
          }
        },
      })
        .then(async (instance: any) => {
          window.viewerInstance = instance;
          console.log('Nutrient Viewer loaded successfully.');
        })
        .catch((error: Error) => {
          console.error('Error loading Nutrient Viewer:', error);
        });
    }

    return () => {
      // Disconnect both observers
      if (observer) {
        observer.disconnect();
      }
      if (shadowObserver) {
        shadowObserver.disconnect();
      }
      // Clean up the viewer instance
      if (container) {
        NutrientViewer?.unload(container);
      }
    };
  }, [document]); // Only depend on document changes

  // You must set the container height and width
  return (
    <div>
      <div ref={containerRef} style={{ height: '100vh', width: '100%' }} />
      {loaded && (
        <div style={{ position: 'fixed', top: 10, right: 10, background: 'white', padding: '10px', border: '1px solid #ccc' }}>
          <p>
            Pages loaded: {pagesLoaded}/{pageCount}
          </p>
          <p>Click anywhere in the document to detect the section</p>
        </div>
      )}
    </div>
  );
}
