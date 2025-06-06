'use client';

import React, { useEffect, useRef } from 'react';

function cleanString(str: string): string {
  return str.replace(/(\.\s*|\s*\d+\s*)+$/, '').trim();
}

export default function Viewer({ document }: ViewerProps) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    let observer: MutationObserver | null = null;

    const { NutrientViewer } = window;
    if (container && NutrientViewer) {
      const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY || '';

      observer = new MutationObserver(function () {
        const pageClassSelector = 'PSPDFKit-Page';
        if (window.document.getElementsByClassName(pageClassSelector).length > 0) {
          console.log('PSPDFKit-Page loaded.');
          observer!.disconnect();
        }
      });

      const target = window.document.querySelector('body');

      // Start observing the container for changes
      if (target) {
        observer.observe(target, {
          // observer.observe(container, {
          childList: true,
          subtree: true,
        });
      }

      NutrientViewer.load({
        container,
        document,
        licenseKey: licenseKey,
        renderPageCallback: function (ctx, pageIndex) {
          if (pageIndex === window.viewerInstance.totalPageCount - 1) {
            console.log('last page loaded');

            window.viewerInstance.addEventListener('annotations.press', async (event: { annotation: any; preventDefault?: () => void }) => {
              if (event.annotation instanceof NutrientViewer.Annotations.LinkAnnotation) {
                event.preventDefault?.();
                const bbox = event.annotation?.toJSON()?.boundingBox?.toJSON() || null;
                const pageIndex = event.annotation.pageIndex;

                if (bbox && pageIndex !== null) {
                  const rect = new NutrientViewer.Geometry.Rect(bbox);
                  const rectList = NutrientViewer.Immutable.List([rect]);
                  const text = await window.viewerInstance.getTextFromRects(pageIndex, rectList);

                  const cleanedText = cleanString(text);

                  const textElements = await window.viewerInstance.contentDocument.querySelectorAll('.PSPDFKit-Text');

                  // Find all spans that contain the cleaned text
                  const matchingSpans = Array.from(textElements).filter((span) => (span as Element)?.textContent?.includes(cleanedText));

                  if (matchingSpans.length > 1) {
                    // Get the last matching span (the actual content, not the table of contents link)
                    const targetSpan = matchingSpans[matchingSpans.length - 1] as Element;

                    // Scroll to the target span
                    targetSpan.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                      inline: 'nearest',
                    });
                  } else {
                    alert(`No matching content found for "${cleanedText}"`);
                  }
                }
              }
            });
          }
        },
      })
        .then(async (instance) => {
          window.viewerInstance = instance;
        })
        .catch((error: Error) => {
          console.error('Error loading Nutrient Viewer:', error);
        });
    }

    return () => {
      // Disconnect the MutationObserver
      if (observer) {
        observer.disconnect();
      }
      // Clean up the viewer instance
      NutrientViewer?.unload(container);
    };
  }, [document]); // Only depend on document changes

  // You must set the container height and width
  return <div ref={containerRef} style={{ height: '100vh', width: '100%' }} />;
}
