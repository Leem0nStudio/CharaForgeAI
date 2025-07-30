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
  let match;
  while ((match = placeholderPattern.exec(template)) !== null) {
    uniqueMatches.add(match[1]); // e.g., "accessory", "color.palette_triad[0]"
  }

  const placeholders: Placeholder[] = [];
  const processedKeys = new Set<string>();

  for (const inner of uniqueMatches) {
    const keyMatch = inner.match(/^([^\[\]]+)(\[(\d+)\])?$/);
    if (!keyMatch) continue;

    const rawKey = keyMatch[1]; // e.g., "color.palette_triad"
    
    // Only process each unique rawKey once
    if (processedKeys.has(rawKey)) continue;

    const def = parsed.placeholders?.[rawKey];

    if (def) {
       placeholders.push({
        key: rawKey,
        fullMatch: `{${rawKey}}`, // This is a representative match, not all of them
        type: def.type,
        label: def.label,
        options: def.options,
      });
      processedKeys.add(rawKey);
    } else {
        placeholders.push({
        key: rawKey,
        fullMatch: `{${rawKey}}`,
        type: 'text', // Default type for undefined placeholders
        label: rawKey,
      });
      processedKeys.add(rawKey);
    }
  }

  return {
    template,
    negativePrompt,
    placeholders,
  };
}
