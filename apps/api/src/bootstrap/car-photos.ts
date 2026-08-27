// Curated stock car photos (Unsplash CDN) keyed by body type. Used to backfill
// demo listings that have no dealer-uploaded media so the UI shows real cars.
const U = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=72&auto=format&fit=crop`;

const BY_BODY: Record<string, string[]> = {
  Hatchback: [
    'photo-1552519507-da3b142c6e3d',
    'photo-1583121274602-3e2820c69888',
    'photo-1494976388531-d1058494cdd8',
  ],
  SUV: [
    'photo-1606664515524-ed2f786a0bd6',
    'photo-1533473359331-0135ef1b58bf',
    'photo-1568605117036-5fe5e7bab0b7',
  ],
  Sedan: [
    'photo-1550355291-bbee04a92027',
    'photo-1541899481282-d53bffe3c35d',
    'photo-1502877338535-766e1452684a',
  ],
  MUV: [
    'photo-1568605117036-5fe5e7bab0b7',
    'photo-1503376780353-7e6692767b70',
    'photo-1606664515524-ed2f786a0bd6',
  ],
};
const DEFAULT = [
  'photo-1503376780353-7e6692767b70',
  'photo-1552519507-da3b142c6e3d',
  'photo-1550355291-bbee04a92027',
];

/** 3 photo URLs for a vehicle, chosen by body type. */
export function photosFor(bodyType: string | null | undefined): string[] {
  return (BY_BODY[bodyType ?? ''] ?? DEFAULT).map(U);
}
