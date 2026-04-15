export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  images: string[]; // Base64 encoded images
  stock: number;
  category: 'tool' | 'challenge';
  type: 'software' | 'hardware' | 'both';
}
