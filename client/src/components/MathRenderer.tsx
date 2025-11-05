import 'katex/dist/katex.min.css';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  textColor?: string; // For chalkboard theme
}

export default function MathRenderer({ content, className = '', textColor = '' }: MathRendererProps) {
  // Parse content for math expressions
  const parseContent = (text: string) => {
    const parts: Array<{ type: 'text' | 'math', content: string, display: boolean }> = [];
    
    // Match $$display math$$ and $inline math$
    const mathPattern = /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = mathPattern.exec(text)) !== null) {
      // Add text before math
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index),
          display: false
        });
      }
      
      // Add math
      const mathContent = match[0];
      const isDisplay = mathContent.startsWith('$$');
      const latex = isDisplay 
        ? mathContent.slice(2, -2).trim()
        : mathContent.slice(1, -1).trim();
      
      parts.push({
        type: 'math',
        content: latex,
        display: isDisplay
      });
      
      lastIndex = match.index + mathContent.length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
        display: false
      });
    }
    
    return parts;
  };

  const parts = parseContent(content);

  return (
    <div className={className}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index} className={textColor}>{part.content}</span>;
        }
        
        try {
          const html = katex.renderToString(part.content, {
            displayMode: part.display,
            throwOnError: false,
            output: 'html',
          });
          
          // Inject chalk color into KaTeX output if needed
          const styledHtml = textColor 
            ? html.replace(/<span/g, `<span class="${textColor}"`)
            : html;
          
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{ __html: styledHtml }}
              className={`${part.display ? 'block my-4' : 'inline'} ${textColor}`}
            />
          );
        } catch (error) {
          console.error('KaTeX rendering error:', error);
          return (
            <span key={index} className={`text-red-400 ${textColor}`}>
              [Math Error: {part.content}]
            </span>
          );
        }
      })}
    </div>
  );
}

