import React from 'react';

/**
 * {{NAME_PASCAL}} Layout Component
 * 
 * Layout wrapper for {{NAME}} pages
 * Generated on {{DATE}}
 */
export default function {{NAME_PASCAL}}Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="{{NAME_KEBAB}}-layout">
      {/* Layout header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">{{NAME_PASCAL}}</h2>
            
            {/* Add navigation items here */}
            <div className="flex space-x-2">
              <a
                href="/{{NAME_KEBAB}}"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Overview
              </a>
              <a
                href="/{{NAME_KEBAB}}/settings"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </a>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Layout footer (optional) */}
      <div className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            {{NAME_PASCAL}} • LifeBox IoT Platform
          </p>
        </div>
      </div>
    </div>
  );
}