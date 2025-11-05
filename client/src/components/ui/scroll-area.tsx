import * as React from "react"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    const viewportRef = React.useRef<HTMLDivElement>(null);
    
    React.useImperativeHandle(ref, () => viewportRef.current as HTMLDivElement);
    
    return (
      <div
        className={`relative overflow-hidden ${className || ''}`}
        {...props}
      >
        <div
          ref={viewportRef}
          className="h-full w-full overflow-y-scroll overflow-x-hidden"
          data-radix-scroll-area-viewport
        >
          {children}
        </div>
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }

