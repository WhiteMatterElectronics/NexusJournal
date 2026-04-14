import { Clock, Activity, StickyNote, Cloud, Cpu } from 'lucide-react';
import { WidgetDefinition } from '../types/widgets';
import { ClockWidget } from './ClockWidget';
import { SystemMonitorWidget } from './SystemMonitorWidget';
import { NotesWidget } from './NotesWidget';
import { WeatherWidget } from './WeatherWidget';
import { EspStatusWidget } from './EspStatusWidget';

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: 'esp_status',
    name: 'ESP32 Status',
    description: 'Real-time ESP32 hardware status via UART.',
    icon: Cpu,
    component: EspStatusWidget,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 }
  },
  {
    id: 'clock',
    name: 'Digital Clock',
    description: 'A simple digital clock with date.',
    icon: Clock,
    component: ClockWidget,
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 1, h: 1 }
  },
  {
    id: 'sys_monitor',
    name: 'System Monitor',
    description: 'Real-time CPU and RAM monitoring.',
    icon: Activity,
    component: SystemMonitorWidget,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 }
  },
  {
    id: 'notes',
    name: 'Scratchpad',
    description: 'Quick notes right on your desktop.',
    icon: StickyNote,
    component: NotesWidget,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 }
  },
  {
    id: 'weather',
    name: 'Weather Station',
    description: 'Real-time weather for Bucharest.',
    icon: Cloud,
    component: WeatherWidget,
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 }
  }
];

export const getWidgetById = (id: string) => WIDGET_REGISTRY.find(w => w.id === id);
