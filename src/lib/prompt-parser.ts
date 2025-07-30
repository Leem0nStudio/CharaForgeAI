import yaml from 'js-yaml';

export interface Placeholder {
  key: string;
  fullMatch: string;
  type: string;
  label: string;
  options?: string[];
  repeatIndex?: number;
}

export interface ParsedPromptTemplate {
  template: string;
  negativePrompt: string;
  placeholders: Placeholder[];
}

export function parsePromptTemplateYAML(yamlText: string): ParsedPromptTemplate {
  const parsed = yaml.load(yamlText) as any;
  const template = parsed.template || '';
  const negativePrompt = parsed.negative_prompt || '';

  const placeholderPattern = /{([^{}]+)}/g;

  // Use a set to avoid duplicate placeholder definitions from template strings
  const uniqueMatches = new Set<string>();
  const allMatches = [...template.matchAll(placeholderPattern)];

  const placeholders: Placeholder[] = [];

  for (const match of allMatches) {
    const fullMatch = match[0]; // e.g. "{accessory}"
    const inner = match[1]; // e.g. "accessory", "color.palette_triad[0]"

    const keyMatch = inner.match(/^([^\[\]]+)(\[(\d+)\])?$/);
    if (!keyMatch) continue;

    const rawKey = keyMatch[1]; // e.g., "color.palette_triad"
    const index = keyMatch[3] ? parseInt(keyMatch[3], 10) : undefined;
    
    const def = parsed.placeholders?.[rawKey] ?? parsed.placeholders?.[inner];

    let label = rawKey;
    if (def?.label) {
        label = index !== undefined ? `${def.label} #${index + 1}` : def.label;
    }

    placeholders.push({
      key: inner, // Use the full inner key for uniqueness in the form
      fullMatch: fullMatch,
      type: def?.type || 'text', // Default type for undefined placeholders
      label: label,
      options: def?.options,
      repeatIndex: index
    });
  }
  
  // Create a unique list of placeholders to render in the form
  // This prevents rendering {color[0]} and {color[1]} as two separate form fields
  // if they share the same base `key`. We will handle the array logic in the builder.
  const uniqueRenderPlaceholders = Array.from(new Map(placeholders.map(p => {
    const baseKey = p.key.split('[')[0];
    const def = parsed.placeholders?.[baseKey];
    return [baseKey, { ...p, key: baseKey, label: def?.label ?? baseKey }];
  })).values());


  return {
    template,
    negativePrompt,
    placeholders: uniqueRenderPlaceholders,
  };
}

    