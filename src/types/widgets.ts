import React from 'react';

export interface WidgetProps {
  instanceId: string;
  config?: any;
  isFloating?: boolean;
  mainColor: string;
  isDarkMode: boolean;
  globalTheme: 'retro' | 'glassy';
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType<WidgetProps>;
  defaultSize: { w: number, h: number };
  minSize: { w: number, h: number };
  maxSize?: { w: number, h: number };
}

export interface ActiveWidget {
  instanceId: string;
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isFloating: boolean;
  config?: any;
}
