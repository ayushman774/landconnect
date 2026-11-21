export type LandCategory = 'All' | 'Residential' | 'Commercial' | 'Agricultural';
export type Property = {
  id: string;
  title: string;
  location: string;
  price: string;
  area: string;
  category: Exclude<LandCategory, 'All'>;
};
export const categories: LandCategory[] = ['All', 'Residential', 'Commercial', 'Agricultural'];
// Demonstration records only. Replace with authenticated API responses.
export const sampleProperties: Property[] = [
  { id: 'plot-1', title: 'Residential Plot', location: 'Whitefield, Bengaluru', price: '₹85 L', area: '2,400 sq.ft', category: 'Residential' },
  { id: 'plot-2', title: 'Commercial Corner Plot', location: 'Sarjapur Road, Bengaluru', price: '₹1.45 Cr', area: '3,200 sq.ft', category: 'Commercial' },
  { id: 'plot-3', title: 'Agricultural Land', location: 'Devanahalli, Bengaluru', price: '₹62 L', area: '1.5 acres', category: 'Agricultural' },
];
