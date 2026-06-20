export interface SearchQuery {
  make?: string;
  model?: string;
  city?: string;
  fuelType?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface MatchableVehicle {
  make: string | null;
  model: string | null;
  city: string | null;
  fuelType: string | null;
  price: number | null;
}

const ci = (a: string | null, b: string) => (a ?? '').toLowerCase().includes(b.toLowerCase());

/** Does a vehicle satisfy a saved-search query? (used for price-drop alerts) */
export function savedSearchMatches(q: SearchQuery, v: MatchableVehicle): boolean {
  if (q.make && !ci(v.make, q.make)) return false;
  if (q.model && !ci(v.model, q.model)) return false;
  if (q.city && !ci(v.city, q.city)) return false;
  if (q.fuelType && (v.fuelType ?? '').toLowerCase() !== q.fuelType.toLowerCase()) return false;
  if (q.minPrice != null && (v.price ?? 0) < q.minPrice) return false;
  if (q.maxPrice != null && (v.price ?? Infinity) > q.maxPrice) return false;
  return true;
}
