'use client';

import React, { useEffect, useRef, useState } from 'react';

function cleanString(str: string): string {
  return str.replace(/(\.\s*|\s*\d+\s*)+$/, '').trim();
}

interface ViewerProps {
  document: string;
}

interface AnnotationPressEvent {
  annotation: {
    pageIndex: number;
    toJSON: () => {
      boundingBox?: {
        toJSON: () => unknown;
      };
    };
  };
  preventDefault?: () => void;
}

export default function DebugViewer({ document }: ViewerProps) {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    let observer: MutationObserver | null = null;
    let shadowObserver: MutationObserver | null = null;
    let shadowRoot: ShadowRoot | null = null;

    const { NutrientViewer } = window;
    if (container && NutrientViewer) {
      const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || '';

      // Function to set up shadow DOM observer
      const setupShadowObserver = (detectedShadowRoot: ShadowRoot) => {
        console.log('Setting up shadow DOM observer...');
        shadowRoot = detectedShadowRoot;

        shadowObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const element = node as Element;
                  if (element.classList && element.classList.contains('PSPDFKit-Text')) {
                    console.log('PSPDFKit-Text element added to shadow DOM:', element);
                  }
                }
              });
            }
          });
        });

        shadowObserver.observe(detectedShadowRoot, {
          childList: true,
          subtree: true,
        });
      };

      // Main observer setup
      const mutationCallback = (mutationList: MutationRecord[]) => {
        for (const mutation of mutationList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.className === 'PSPDFKit-Container') {
                  console.log('PSPDFKit-Container found:', element);

                  if (element.shadowRoot) {
                    setupShadowObserver(element.shadowRoot);
                  } else {
                    const checkForShadowRoot = () => {
                      if (element.shadowRoot) {
                        setupShadowObserver(element.shadowRoot);
                      } else {
                        setTimeout(checkForShadowRoot, 100);
                      }
                    };
                    setTimeout(checkForShadowRoot, 100);
                  }
                }
              }
            });
          }
        }
      };

      observer = new MutationObserver(mutationCallback);
      observer.observe(container, { attributes: true, childList: true, subtree: true });

      NutrientViewer.load({
        container,
        document,
        licenseKey: licenseKey,
        renderPageCallback: async function (ctx, pageIndex) {
          if (pageIndex === window.viewerInstance.totalPageCount - 1) {
            console.log('🚀 LAST PAGE LOADED - STARTING COMPREHENSIVE DEBUGGING...');

            if (!loaded) {
              // 🔍 COMPREHENSIVE DEBUGGING SETUP
              console.log('📊 COMPREHENSIVE DOM & SCROLL ANALYSIS STARTING...');

              // Track network requests
              const originalFetch = window.fetch;
              window.fetch = function (...args) {
                console.log('🌐 NETWORK REQUEST:', args[0]);
                return originalFetch.apply(this, args);
              };

              // Enhanced scroll listener
              const addScrollListener = (element: Element, name: string) => {
                console.log(`👂 Adding scroll listener to: ${name}`);
                element.addEventListener(
                  'scroll',
                  (event) => {
                    console.log(`🔄 SCROLL DETECTED on ${name}:`, {
                      scrollTop: (element as HTMLElement).scrollTop,
                      scrollLeft: (element as HTMLElement).scrollLeft,
                      scrollHeight: (element as HTMLElement).scrollHeight,
                      clientHeight: (element as HTMLElement).clientHeight,
                      scrollWidth: (element as HTMLElement).scrollWidth,
                      clientWidth: (element as HTMLElement).clientWidth,
                      element: element,
                      event: event,
                    });
                  },
                  { passive: true },
                );
              };

              // Enhanced mutation observer for scroll attempts
              const debugMutationObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    console.log('🧬 MUTATION DURING SCROLL ATTEMPT:', {
                      addedNodes: mutation.addedNodes.length,
                      target: mutation.target,
                      addedElements: Array.from(mutation.addedNodes).filter((node) => node.nodeType === Node.ELEMENT_NODE),
                    });
                  }
                });
              });

              if (shadowRoot) {
                debugMutationObserver.observe(shadowRoot, { childList: true, subtree: true });

                // 📊 DETAILED DOM ANALYSIS
                console.log('🔍 ANALYZING SHADOW DOM STRUCTURE...');
                console.log('📋 SHADOW ROOT CHILDREN:', shadowRoot.children);

                // Find ALL elements and categorize them
                const allElements = Array.from(shadowRoot.querySelectorAll('*'));
                console.log(`📊 Total elements in shadow DOM: ${allElements.length}`);

                // Categorize elements
                const elementsByTag = {};
                const elementsByClass = {};

                allElements.forEach((el) => {
                  const tagName = el.tagName.toLowerCase();
                  const className = el.className;

                  if (!elementsByTag[tagName]) elementsByTag[tagName] = [];
                  elementsByTag[tagName].push(el);

                  if (className && typeof className === 'string') {
                    const classes = className.split(' ');
                    classes.forEach((cls) => {
                      if (cls.trim()) {
                        if (!elementsByClass[cls]) elementsByClass[cls] = [];
                        elementsByClass[cls].push(el);
                      }
                    });
                  }
                });

                console.log('📊 ELEMENTS BY TAG:', elementsByTag);
                console.log('📊 ELEMENTS BY CLASS:', elementsByClass);

                // 🎯 COMPREHENSIVE SCROLL TESTING
                console.log('🎯 STARTING COMPREHENSIVE SCROLL TESTING...');

                interface ScrollInfo {
                  index: number;
                  tagName: string;
                  className: string;
                  id: string;
                  scrollHeight: number;
                  clientHeight: number;
                  scrollWidth: number;
                  clientWidth: number;
                  scrollTop: number;
                  scrollLeft: number;
                  overflow: string;
                  overflowX: string;
                  overflowY: string;
                  position: string;
                  display: string;
                  width: number;
                  height: number;
                  hasVerticalScroll: boolean;
                  hasHorizontalScroll: boolean;
                }

                interface PotentialScroller {
                  element: Element;
                  info: ScrollInfo;
                }

                const potentialScrollers: PotentialScroller[] = [];

                allElements.forEach((el, index) => {
                  const htmlEl = el as HTMLElement;
                  const styles = getComputedStyle(el);
                  const rect = htmlEl.getBoundingClientRect();

                  const scrollInfo = {
                    index,
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    scrollHeight: htmlEl.scrollHeight,
                    clientHeight: htmlEl.clientHeight,
                    scrollWidth: htmlEl.scrollWidth,
                    clientWidth: htmlEl.clientWidth,
                    scrollTop: htmlEl.scrollTop,
                    scrollLeft: htmlEl.scrollLeft,
                    overflow: styles.overflow,
                    overflowX: styles.overflowX,
                    overflowY: styles.overflowY,
                    position: styles.position,
                    display: styles.display,
                    width: rect.width,
                    height: rect.height,
                    hasVerticalScroll: htmlEl.scrollHeight > htmlEl.clientHeight,
                    hasHorizontalScroll: htmlEl.scrollWidth > htmlEl.clientWidth,
                  };

                  // Log potential scrollers
                  if (
                    scrollInfo.hasVerticalScroll ||
                    scrollInfo.hasHorizontalScroll ||
                    styles.overflow.includes('scroll') ||
                    styles.overflow.includes('auto') ||
                    styles.overflowY.includes('scroll') ||
                    styles.overflowY.includes('auto')
                  ) {
                    console.log(`🎯 POTENTIAL SCROLLER ${index}:`, scrollInfo);
                    potentialScrollers.push({ element: el, info: scrollInfo });
                  }
                });

                console.log(`🎯 Found ${potentialScrollers.length} potential scrollable elements`);

                // Test scrolling each element with detailed logging
                potentialScrollers.forEach(({ element, info }, index) => {
                  console.log(`🧪 TEST ${index + 1}: Attempting scroll on element:`, info);

                  addScrollListener(element, `PotentialScroller-${index}-${info.tagName}-${info.className}`);

                  const htmlEl = element as HTMLElement;
                  const beforeScroll = {
                    scrollTop: htmlEl.scrollTop,
                    scrollLeft: htmlEl.scrollLeft,
                  };

                  // Try multiple scroll amounts with delays
                  const testScrollAmounts = [100, 500, 1000, 2000];

                  testScrollAmounts.forEach((amount, amountIndex) => {
                    setTimeout(
                      () => {
                        htmlEl.scrollTop = amount;
                        htmlEl.scrollLeft = amount;

                        const afterScroll = {
                          scrollTop: htmlEl.scrollTop,
                          scrollLeft: htmlEl.scrollLeft,
                        };

                        console.log(`📏 SCROLL TEST (${amount}px):`, {
                          element: info,
                          before: beforeScroll,
                          after: afterScroll,
                          changed: beforeScroll.scrollTop !== afterScroll.scrollTop || beforeScroll.scrollLeft !== afterScroll.scrollLeft,
                        });
                      },
                      index * 200 + amountIndex * 50,
                    );
                  });
                });

                // Test specific selectors
                const nutrientSelectors = [
                  '.PSPDFKit-Container',
                  '.PSPDFKit-Viewport',
                  '.PSPDFKit-Pages',
                  '.PSPDFKit-Page',
                  '.PSPDFKit-Text',
                  '[data-testid]',
                  '[role]',
                ];

                nutrientSelectors.forEach((selector, selectorIndex) => {
                  const elements = shadowRoot!.querySelectorAll(selector);
                  console.log(`🎯 SELECTOR TEST "${selector}": Found ${elements.length} elements`);

                  elements.forEach((el, elIndex) => {
                    addScrollListener(el, `Selector-${selector}-${elIndex}`);
                    setTimeout(
                      () => {
                        (el as HTMLElement).scrollTop = 1000;
                        console.log(`🧪 Attempted scroll on ${selector}[${elIndex}]`);
                      },
                      selectorIndex * 300 + elIndex * 100,
                    );
                  });
                });

                // Final comprehensive log after all tests
                setTimeout(() => {
                  console.log('🏁 SCROLL TESTING COMPLETE - FINAL STATUS:');
                  console.log('📊 Check above logs for:');
                  console.log('   🔄 SCROLL DETECTED messages - these show which elements actually scrolled');
                  console.log('   🧬 MUTATION DURING SCROLL ATTEMPT - these show if content was added');
                  console.log('   🌐 NETWORK REQUEST - these show if lazy loading made network calls');
                  console.log('   📏 SCROLL TEST results - these show before/after scroll positions');
                }, 5000);
              } else {
                console.log('❌ Shadow root not available - using fallback methods');

                // Fallback testing
                const containerElement = container as HTMLElement;
                if (containerElement) {
                  addScrollListener(containerElement, 'MainContainer');
                  containerElement.scrollTop = 2000;
                  console.log('⬇️ Attempted scroll on main container');
                }

                window.scrollTo(0, 2000);
                console.log('⬇️ Attempted window scroll');
              }

              setLoaded(true);
            }
          }
        },
      })
        .then(async (instance) => {
          window.viewerInstance = instance;
          console.log('Nutrient Viewer loaded successfully.');
        })
        .catch((error: Error) => {
          console.error('Error loading Nutrient Viewer:', error);
        });
    }

    return () => {
      if (observer) observer.disconnect();
      if (shadowObserver) shadowObserver.disconnect();
      NutrientViewer?.unload(container);
    };
  }, [document]);

  return <div ref={containerRef} style={{ height: '100vh', width: '100%' }} />;
}
