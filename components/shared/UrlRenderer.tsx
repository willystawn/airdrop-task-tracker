
import React from 'react';

interface UrlRendererProps {
  text: string;
  renderAsParagraphs?: boolean; // New prop
}

// Helper function to process a single block of text (either a full text or a single paragraph line)
// It finds markdown links and raw URLs within the inputText.
const processTextForLinksAndUrls = (inputText: string, keyPrefix: string): React.ReactNode[] => {
    const markdownLinkRegex = /\[([^\]]+?)\]\(([^)]+?)\)/g; 
    const urlRegex = /(\b(?:https?|ftp|file):\/\/[-\w+&@#/%?=~_|!:,.;]*[-\w+&@#/%=~_|])|(\bwww\.[-\w+&@#/%?=~_|!:,.;]*[-\w+&@#/%=~_|])/gi;

    const parts: Array<{ type: 'markdownLink' | 'text', content: any, href?: string, key?: string }> = [];
    let lastIndex = 0;

    // 1. Find all markdown links
    const markdownMatches = Array.from(inputText.matchAll(markdownLinkRegex));
    markdownMatches.forEach((mdMatch, mdIdx) => {
        if (mdMatch.index! > lastIndex) {
            parts.push({ type: 'text', content: inputText.substring(lastIndex, mdMatch.index!) });
        }
        let url = mdMatch[2];
        if (url.startsWith('www.')) {
            url = `https://${url}`;
        } else if (!/^(https?|ftp|file):\/\//i.test(url) && url.includes('.')) {
            // Basic check if it looks like a domain that needs https prepended
            // This won't catch all edge cases like "localhost" or IP addresses without scheme.
            url = `https://${url}`;
        }
        parts.push({ type: 'markdownLink', content: mdMatch[1], href: url, key: `${keyPrefix}-md-${mdIdx}` });
        lastIndex = mdMatch.index! + mdMatch[0].length;
    });

    // Add any remaining text after the last markdown link
    if (lastIndex < inputText.length) {
        parts.push({ type: 'text', content: inputText.substring(lastIndex) });
    }

    // 2. Process 'text' parts for raw URLs
    const finalElements: React.ReactNode[] = [];
    parts.forEach((part, partIdx) => {
        if (part.type === 'markdownLink') {
            finalElements.push(
                <a
                  key={part.key || `${keyPrefix}-mdlink-${partIdx}`}
                  href={part.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {part.content}
                </a>
            );
        } else if (part.type === 'text') {
            const textContent = part.content;
            const subParts: React.ReactNode[] = [];
            let subLastIndex = 0;
            const rawUrlMatches: RegExpMatchArray[] = Array.from(textContent.matchAll(urlRegex));

            rawUrlMatches.forEach((rawMatch: RegExpMatchArray, rawIdx: number) => {
                if (rawMatch.index! > subLastIndex) {
                    subParts.push(<React.Fragment key={`${keyPrefix}-text-${partIdx}-rawtext-${rawIdx}`}>{textContent.substring(subLastIndex, rawMatch.index!)}</React.Fragment>);
                }
                let rawUrl = rawMatch[0];
                if (rawUrl.startsWith('www.')) {
                    rawUrl = `https://${rawUrl}`;
                }
                subParts.push(
                    <a
                      key={`${keyPrefix}-rawlink-${partIdx}-${rawIdx}`}
                      href={rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {rawMatch[0]}
                    </a>
                );
                subLastIndex = rawMatch.index! + rawMatch[0].length;
            });
            if (subLastIndex < textContent.length) {
                 subParts.push(<React.Fragment key={`${keyPrefix}-text-${partIdx}-remaining`}>{textContent.substring(subLastIndex)}</React.Fragment>);
            }
            
            if (subParts.length > 0) {
                 finalElements.push(...subParts);
            } else {
                 // If subParts is empty but textContent was not, push the original textContent
                 // This ensures that text without any URLs is still rendered.
                 finalElements.push(<React.Fragment key={`${keyPrefix}-text-${partIdx}-full`}>{textContent}</React.Fragment>);
            }
        }
    });
    return finalElements;
};

export const UrlRenderer: React.FC<UrlRendererProps> = ({ text, renderAsParagraphs = false }) => {
  if (!text) return null;

  if (renderAsParagraphs) {
    const lines = text.split('\n'); // Split by each individual newline.
    
    return (
      <>
        {lines.map((lineText, index) => {
          // If the original line (before any processing by processTextForLinksAndUrls)
          // is empty or consists only of whitespace, render it as a paragraph
          // containing a <br /> to ensure it occupies vertical space.
          if (lineText.trim() === '') {
            return <p key={`paragraph-${index}-empty`}><br /></p>;
          }
          
          // Process the line for URLs and markdown links.
          const contentNodes = processTextForLinksAndUrls(lineText, `paragraph-${index}`);
          
          // Render the processed content within a paragraph tag.
          // The `prose` Tailwind class on the parent in TaskItem.tsx should handle paragraph styling.
          return (
            <p key={`paragraph-${index}`}>
              {contentNodes}
            </p>
          );
        })}
      </>
    );
  } else {
    // Process the whole text as one block, converting \n to <br /> for non-paragraph rendering.
    const lines = text.split('\n');
    return (
      <>
        {lines.map((line, lineIndex) => {
          const contentNodes = processTextForLinksAndUrls(line, `l${lineIndex}`);
          return (
            <React.Fragment key={`line-${lineIndex}`}>
              {contentNodes}
              {lineIndex < lines.length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </>
    );
  }
};
