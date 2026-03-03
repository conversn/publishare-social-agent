import { shortcodeRenderers } from './renderers';

export function renderShortcodes(content: string): string {
  // Simple shortcode parser - matches [shortcode attr="value"]content[/shortcode] or [shortcode attr="value"]
  const shortcodeRegex = /\[(\w+)([^\]]*)\](?:(.*?)\[\/\1\])?/g;
  
  return content.replace(shortcodeRegex, (match, tag, attrs, content) => {
    const renderer = shortcodeRenderers[tag as keyof typeof shortcodeRenderers];
    
    if (!renderer) {
      return match; // Return original if no renderer found
    }
    
    // Parse attributes
    const attrObj: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      attrObj[attrMatch[1]] = attrMatch[2];
    }
    
    return renderer(attrObj, content);
  });
}

