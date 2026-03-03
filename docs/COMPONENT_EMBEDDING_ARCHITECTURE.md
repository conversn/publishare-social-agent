# Component Embedding Architecture Analysis
## Shortcode System for Interactive Components in CMS

## Executive Summary

**Question:** How to develop components in the application but embed them dynamically in CMS content?

**Answer:** Yes, this is architecturally sound. Multiple approaches exist, each with trade-offs. A **shortcode-based component registry** is recommended for flexibility, maintainability, and security.

---

## Current State Analysis

### Existing Implementation Patterns

#### 1. **JSONB Config Approach** (Currently Used)
```typescript
// Articles table has JSONB fields:
calculator_config JSONB
tool_config JSONB
checklist_config JSONB

// Rendering logic:
if (content.content_type === 'calculator') {
  return <CalculatorWrapper config={content.calculator_config} />
}
```

**Pros:**
- ✅ Type-safe configuration
- ✅ Structured data
- ✅ Easy to query/index

**Cons:**
- ❌ Only works for full-page calculators
- ❌ Can't embed multiple components in one article
- ❌ Requires article-level content_type
- ❌ Not flexible for inline embedding

#### 2. **Placeholder Splitting** (Strategy Guides)
```typescript
// Content has placeholder:
"[EMBEDDED CALCULATOR WILL APPEAR HERE]"

// Component splits and renders:
const parts = article.content.split('[EMBEDDED CALCULATOR WILL APPEAR HERE]')
return (
  <>
    <div dangerouslySetInnerHTML={{ __html: parts[0] }} />
    <RMDCalculator />
    <div dangerouslySetInnerHTML={{ __html: parts[1] }} />
  </>
)
```

**Pros:**
- ✅ Allows inline embedding
- ✅ Simple implementation

**Cons:**
- ❌ Fragile (depends on exact placeholder text)
- ❌ Only one component per article
- ❌ Not scalable
- ❌ Hard to maintain

#### 3. **Hardcoded Component Mapping** (Current)
```typescript
const calculatorSlugs = {
  'social-security-optimization-calculator': SocialSecurityCalculator,
  'medicare-cost-calculator': MedicareCostCalculator,
  // ...
}
```

**Pros:**
- ✅ Type-safe
- ✅ Direct component reference

**Cons:**
- ❌ Requires code changes for new components
- ❌ Not dynamic
- ❌ Can't be managed in CMS

---

## Architecture Options Analysis

### Option 1: Shortcode System (Recommended)

#### Architecture
```
CMS Content (HTML/Markdown)
  ↓
[calculator id="social-security" theme="blue"]
  ↓
Shortcode Parser (Server-side)
  ↓
Component Registry Lookup
  ↓
React Component Rendering (Client-side hydration)
```

#### Implementation

**1. Shortcode Syntax**
```html
<!-- In CMS content (html_body or markdown) -->
<p>Use our calculator to estimate your benefits:</p>

[calculator id="social-security" theme="blue" width="full"]

<p>Continue reading about strategies...</p>

[calculator id="medicare-cost" theme="green" width="inline"]

[cta type="consultation" text="Schedule Free Consultation"]
```

**2. Component Registry**
```typescript
// src/lib/component-registry.ts
export const COMPONENT_REGISTRY = {
  calculator: {
    'social-security': {
      component: SocialSecurityCalculator,
      props: { theme: 'blue' },
      clientOnly: true, // Requires client-side hydration
      allowedProps: ['theme', 'width', 'height']
    },
    'medicare-cost': {
      component: MedicareCostCalculator,
      props: {},
      clientOnly: true
    },
    // ... more calculators
  },
  tool: {
    'withdrawal-planner': {
      component: WithdrawalPlannerTool,
      clientOnly: true
    }
  },
  cta: {
    'consultation': {
      component: ConsultationCTA,
      clientOnly: false // Can be server-rendered
    }
  }
} as const
```

**3. Shortcode Parser**
```typescript
// src/lib/shortcode-parser.ts
interface ShortcodeMatch {
  type: string
  id: string
  props: Record<string, string>
  raw: string
}

export function parseShortcodes(content: string): ShortcodeMatch[] {
  const regex = /\[(\w+)\s+([^\]]+)\]/g
  const matches: ShortcodeMatch[] = []
  let match

  while ((match = regex.exec(content)) !== null) {
    const [, type, attrs] = match
    const props = parseAttributes(attrs)
    matches.push({
      type,
      id: props.id || '',
      props,
      raw: match[0]
    })
  }

  return matches
}

function parseAttributes(attrs: string): Record<string, string> {
  const props: Record<string, string> = {}
  const attrRegex = /(\w+)="([^"]+)"/g
  let match
  
  while ((match = attrRegex.exec(attrs)) !== null) {
    props[match[1]] = match[2]
  }
  
  return props
}
```

**4. Content Renderer with Shortcode Support**
```typescript
// src/components/content/ShortcodeRenderer.tsx
'use client'

import { parseShortcodes } from '@/lib/shortcode-parser'
import { COMPONENT_REGISTRY } from '@/lib/component-registry'
import { useEffect, useState } from 'react'

interface ShortcodeRendererProps {
  content: string // HTML content with shortcodes
}

export default function ShortcodeRenderer({ content }: ShortcodeRendererProps) {
  const [hydratedContent, setHydratedContent] = useState<string>('')
  const [components, setComponents] = useState<Array<{
    id: string
    type: string
    props: Record<string, any>
    position: number
    component: React.ComponentType<any>
  }>>([])

  useEffect(() => {
    const shortcodes = parseShortcodes(content)
    const parts: string[] = []
    const componentList: typeof components = []
    let lastIndex = 0

    shortcodes.forEach((shortcode, index) => {
      const shortcodeIndex = content.indexOf(shortcode.raw, lastIndex)
      
      // Add content before shortcode
      parts.push(content.substring(lastIndex, shortcodeIndex))
      
      // Register component
      const registry = COMPONENT_REGISTRY[shortcode.type as keyof typeof COMPONENT_REGISTRY]
      if (registry && registry[shortcode.id]) {
        const componentDef = registry[shortcode.id]
        componentList.push({
          id: `${shortcode.type}-${shortcode.id}-${index}`,
          type: shortcode.type,
          props: { ...componentDef.props, ...shortcode.props },
          position: parts.length,
          component: componentDef.component
        })
        // Add placeholder for component
        parts.push(`<div id="shortcode-${index}"></div>`)
      }
      
      lastIndex = shortcodeIndex + shortcode.raw.length
    })
    
    // Add remaining content
    parts.push(content.substring(lastIndex))
    
    setHydratedContent(parts.join(''))
    setComponents(componentList)
  }, [content])

  return (
    <div className="shortcode-content">
      <div 
        dangerouslySetInnerHTML={{ __html: hydratedContent }}
        ref={(el) => {
          if (el) {
            components.forEach((comp, index) => {
              const placeholder = el.querySelector(`#shortcode-${index}`)
              if (placeholder && comp.component) {
                // Hydrate component (would use React render in production)
                const Component = comp.component
                // This is simplified - actual implementation would use ReactDOM.render
              }
            })
          }
        }}
      />
      {/* Render components separately for now */}
      {components.map((comp) => {
        const Component = comp.component
        return (
          <div key={comp.id} id={comp.id}>
            <Component {...comp.props} />
          </div>
        )
      })}
    </div>
  )
}
```

**5. Server-Side Preprocessing (Better Approach)**
```typescript
// src/lib/render-content-with-shortcodes.tsx
import { parseShortcodes } from './shortcode-parser'
import { COMPONENT_REGISTRY } from './component-registry'

export function renderContentWithShortcodes(content: string) {
  const shortcodes = parseShortcodes(content)
  const parts: Array<string | React.ReactElement> = []
  let lastIndex = 0

  shortcodes.forEach((shortcode) => {
    const shortcodeIndex = content.indexOf(shortcode.raw, lastIndex)
    
    // Add HTML content before shortcode
    if (shortcodeIndex > lastIndex) {
      parts.push(
        <div 
          key={`content-${lastIndex}`}
          dangerouslySetInnerHTML={{ 
            __html: content.substring(lastIndex, shortcodeIndex) 
          }} 
        />
      )
    }
    
    // Add component
    const registry = COMPONENT_REGISTRY[shortcode.type as keyof typeof COMPONENT_REGISTRY]
    if (registry && registry[shortcode.id]) {
      const Component = registry[shortcode.id].component
      const props = { 
        ...registry[shortcode.id].props, 
        ...shortcode.props 
      }
      parts.push(
        <Component key={shortcode.raw} {...props} />
      )
    }
    
    lastIndex = shortcodeIndex + shortcode.raw.length
  })
  
  // Add remaining content
  if (lastIndex < content.length) {
    parts.push(
      <div 
        key={`content-${lastIndex}`}
        dangerouslySetInnerHTML={{ 
          __html: content.substring(lastIndex) 
        }} 
      />
    )
  }
  
  return parts
}
```

**6. Article Display Integration**
```typescript
// src/components/content/EnhancedArticleDisplay.tsx
import { renderContentWithShortcodes } from '@/lib/render-content-with-shortcodes'

export default function EnhancedArticleDisplay({ article }: Props) {
  const content = article.html_body || article.content
  
  return (
    <article>
      <h1>{article.title}</h1>
      <div className="article-content">
        {renderContentWithShortcodes(content)}
      </div>
    </article>
  )
}
```

#### Pros
- ✅ **Flexible**: Multiple components per article
- ✅ **CMS-Friendly**: Content editors can insert shortcodes
- ✅ **Maintainable**: Components live in application code
- ✅ **Type-Safe**: Registry enforces component contracts
- ✅ **Scalable**: Easy to add new components
- ✅ **SEO-Friendly**: Server-side rendering possible
- ✅ **Security**: Whitelist approach (only registered components)

#### Cons
- ⚠️ **Complexity**: Requires parser and registry
- ⚠️ **Hydration**: Client components need careful hydration
- ⚠️ **Validation**: Need to validate shortcode syntax
- ⚠️ **Performance**: Multiple components may impact load time

---

### Option 2: JSONB Block-Based System

#### Architecture
```typescript
// Articles table structure
content_blocks JSONB[] // Array of content blocks

// Block structure:
{
  type: 'text' | 'calculator' | 'cta' | 'image',
  content: string, // HTML or markdown
  config?: {
    calculator_id?: string,
    component_props?: Record<string, any>
  },
  order: number
}
```

#### Implementation
```typescript
// CMS stores structured blocks
const article = {
  content_blocks: [
    { type: 'text', content: '<p>Introduction...</p>', order: 0 },
    { type: 'calculator', config: { calculator_id: 'social-security' }, order: 1 },
    { type: 'text', content: '<p>More content...</p>', order: 2 },
    { type: 'cta', config: { type: 'consultation' }, order: 3 }
  ]
}

// Renderer
function renderBlocks(blocks: ContentBlock[]) {
  return blocks
    .sort((a, b) => a.order - b.order)
    .map(block => {
      switch (block.type) {
        case 'text':
          return <div dangerouslySetInnerHTML={{ __html: block.content }} />
        case 'calculator':
          const Component = COMPONENT_REGISTRY.calculator[block.config.calculator_id]
          return <Component {...block.config.component_props} />
        // ...
      }
    })
}
```

#### Pros
- ✅ **Structured**: Clear data model
- ✅ **Queryable**: Can query by block type
- ✅ **Flexible**: Easy to reorder blocks
- ✅ **Type-Safe**: Strong typing possible

#### Cons
- ❌ **CMS Complexity**: Requires block editor UI
- ❌ **Migration**: Need to convert HTML to blocks
- ❌ **Less Flexible**: Harder for content editors
- ❌ **Storage**: More database space

---

### Option 3: Hybrid Approach (Recommended for Migration)

#### Architecture
- **Phase 1**: Shortcode system for new content
- **Phase 2**: Migrate HTML files to CMS with shortcodes
- **Phase 3**: Optionally convert to blocks for advanced features

#### Migration Strategy

**Step 1: Extract Components from HTML**
```typescript
// Migration script
async function migrateHTMLToCMS(htmlFile: string) {
  const html = fs.readFileSync(htmlFile, 'utf8')
  
  // Extract calculator sections
  const calculatorRegex = /<div[^>]*class="calculator[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  const calculators = [...html.matchAll(calculatorRegex)]
  
  // Replace with shortcodes
  let migratedContent = html
  calculators.forEach((match, index) => {
    const calculatorId = identifyCalculator(match[1]) // Detect which calculator
    migratedContent = migratedContent.replace(
      match[0],
      `[calculator id="${calculatorId}" width="full"]`
    )
  })
  
  // Create article in CMS
  await supabase.from('articles').insert({
    title: extractTitle(html),
    slug: generateSlug(htmlFile),
    html_body: migratedContent,
    content_type: 'guide',
    // ...
  })
}
```

**Step 2: Register Components**
```typescript
// Add to component registry
COMPONENT_REGISTRY.calculator = {
  ...COMPONENT_REGISTRY.calculator,
  'social-security': SocialSecurityCalculator,
  'medicare-cost': MedicareCostCalculator,
  // ... all calculators
}
```

**Step 3: Update Renderer**
```typescript
// Enhanced article display with shortcode support
export default function EnhancedArticleDisplay({ article }: Props) {
  const content = article.html_body || article.content
  const renderedContent = renderContentWithShortcodes(content)
  
  return (
    <article>
      {renderedContent}
    </article>
  )
}
```

---

## Security Considerations

### 1. Component Whitelist
```typescript
// Only registered components can be rendered
const allowedComponents = new Set(Object.keys(COMPONENT_REGISTRY))
if (!allowedComponents.has(shortcode.type)) {
  console.warn(`Unknown component type: ${shortcode.type}`)
  return null // Don't render unknown components
}
```

### 2. Props Validation
```typescript
// Validate props against schema
function validateProps(
  componentDef: ComponentDefinition,
  props: Record<string, any>
): Record<string, any> {
  const validated: Record<string, any> = {}
  
  Object.keys(props).forEach(key => {
    if (componentDef.allowedProps?.includes(key)) {
      validated[key] = props[key]
    }
  })
  
  return validated
}
```

### 3. XSS Prevention
```typescript
// Sanitize HTML content
import DOMPurify from 'dompurify'

const sanitizedContent = DOMPurify.sanitize(htmlContent, {
  ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'class']
})
```

---

## Performance Considerations

### 1. Code Splitting
```typescript
// Lazy load components
const COMPONENT_REGISTRY = {
  calculator: {
    'social-security': {
      component: lazy(() => import('@/components/calculators/SocialSecurityCalculator')),
      // ...
    }
  }
}
```

### 2. Server-Side Rendering
```typescript
// Pre-render static content, hydrate interactive components
export default async function ArticlePage({ params }: Props) {
  const article = await getArticle(params.slug)
  const shortcodes = parseShortcodes(article.html_body)
  
  // Server-render static content
  const staticContent = renderStaticContent(article.html_body, shortcodes)
  
  // Client components will hydrate
  return (
    <div>
      {staticContent}
      <ClientComponentHydrator shortcodes={shortcodes} />
    </div>
  )
}
```

### 3. Caching Strategy
```typescript
// Cache parsed shortcodes
const shortcodeCache = new Map<string, ParsedShortcode[]>()

function getCachedShortcodes(content: string): ParsedShortcode[] {
  const hash = createHash(content)
  if (shortcodeCache.has(hash)) {
    return shortcodeCache.get(hash)!
  }
  
  const parsed = parseShortcodes(content)
  shortcodeCache.set(hash, parsed)
  return parsed
}
```

---

## Implementation Recommendations

### Phase 1: Foundation (Week 1-2)
1. ✅ Create component registry
2. ✅ Build shortcode parser
3. ✅ Implement basic renderer
4. ✅ Add security validation

### Phase 2: Migration (Week 3-4)
1. ✅ Extract components from HTML files
2. ✅ Register all calculators/tools
3. ✅ Migrate 5-10 HTML files as test
4. ✅ Validate rendering and functionality

### Phase 3: CMS Integration (Week 5-6)
1. ✅ Add shortcode UI helper in CMS
2. ✅ Create shortcode documentation
3. ✅ Add preview functionality
4. ✅ Train content team

### Phase 4: Optimization (Week 7-8)
1. ✅ Implement code splitting
2. ✅ Add caching
3. ✅ Performance monitoring
4. ✅ Complete migration

---

## Technical Trade-offs Summary

| Approach | Flexibility | Complexity | Performance | Security | CMS-Friendly |
|----------|------------|------------|-------------|----------|--------------|
| **Shortcode System** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **JSONB Blocks** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Placeholder Splitting** | ⭐⭐ | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **JSONB Config** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

---

## Final Recommendation

**Recommended Architecture: Shortcode System with Component Registry**

### Why This Approach?

1. **Aligns with Your Requirements**
   - ✅ Components developed in application
   - ✅ Dynamically embeddable in CMS
   - ✅ Flexible for content editors
   - ✅ Maintainable and scalable

2. **Industry Standard**
   - WordPress shortcodes (proven pattern)
   - Similar to MDX for React
   - Familiar to content teams

3. **Technical Soundness**
   - Type-safe component registry
   - Security through whitelisting
   - Server-side rendering support
   - Client-side hydration for interactivity

4. **Migration Path**
   - Can migrate HTML files incrementally
   - Backward compatible with existing content
   - No breaking changes to current system

### Implementation Priority

1. **High Priority**: Component registry + shortcode parser
2. **Medium Priority**: CMS UI for shortcode insertion
3. **Low Priority**: Advanced features (preview, validation UI)

---

## Conclusion

**Yes, this architecture is sound and recommended.**

The shortcode system provides the best balance of:
- Developer experience (components in app code)
- Content editor experience (easy to use)
- Technical requirements (security, performance, maintainability)
- Migration path (can move HTML files incrementally)

This approach will allow you to:
- ✅ Migrate HTML guide files to CMS
- ✅ Embed interactive components dynamically
- ✅ Maintain components in application code
- ✅ Scale to new component types easily
- ✅ Keep content and code properly separated

