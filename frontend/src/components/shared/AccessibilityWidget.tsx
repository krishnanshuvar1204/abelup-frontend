import React from 'react';
import { Settings, Type, Contrast } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const AccessibilityWidget = () => {
  const { dyslexicFont, highContrast, toggleDyslexicFont, toggleHighContrast } = useAccessibility();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow" aria-label="Accessibility Settings">
            <Settings className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end" sideOffset={10}>
          <h3 className="font-semibold text-lg mb-4 text-foreground">Accessibility Tools</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Type className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="dyslexic-font" className="cursor-pointer text-foreground">Dyslexia-Friendly Font</Label>
              </div>
              <Switch
                id="dyslexic-font"
                checked={dyslexicFont}
                onCheckedChange={toggleDyslexicFont}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Contrast className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="high-contrast" className="cursor-pointer text-foreground">High Contrast Mode</Label>
              </div>
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={toggleHighContrast}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AccessibilityWidget;
