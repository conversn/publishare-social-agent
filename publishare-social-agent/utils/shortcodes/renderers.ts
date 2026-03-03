// Simple shortcode renderers
export const shortcodeRenderers = {
  calculator: (attrs: Record<string, string>, content?: string) => {
    const id = attrs.id || 'default';
    return `<div class="calculator-embed" data-calculator-id="${id}">Calculator: ${id}</div>`;
  },
  
  quote: (attrs: Record<string, string>, content?: string) => {
    const author = attrs.author || 'Anonymous';
    return `<blockquote class="border-l-4 border-blue-500 pl-4 italic">${content || ''}<cite class="block mt-2 text-sm">— ${author}</cite></blockquote>`;
  },
  
  cta: (attrs: Record<string, string>, content?: string) => {
    const text = attrs.text || 'Click Here';
    const url = attrs.url || '#';
    return `<a href="${url}" class="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">${text}</a>`;
  },
  
  info: (attrs: Record<string, string>, content?: string) => {
    return `<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4"><div class="text-blue-800">${content || ''}</div></div>`;
  }
};

