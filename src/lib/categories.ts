import {
  BedDouble,
  Car,
  HeartPulse,
  Plane,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  label: string
  icon: LucideIcon
  /** Words that suggest this category when they appear in an expense title. */
  keywords: string[]
}

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food & drink', icon: Utensils, keywords: ['dinner', 'lunch', 'breakfast', 'brunch', 'restaurant', 'cafe', 'café', 'coffee', 'pizza', 'sushi', 'burger', 'bar', 'beer', 'wine', 'drinks', 'pastéis', 'takeaway', 'kebab'] },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart, keywords: ['groceries', 'grocery', 'supermarket', 'rema', 'kiwi', 'coop', 'meny', 'lidl', 'aldi', 'tesco', 'pingo', 'continente', 'market', 'snacks'] },
  { id: 'transport', label: 'Transport', icon: Car, keywords: ['taxi', 'uber', 'bolt', 'bus', 'train', 'metro', 'tram', 'fuel', 'gas', 'petrol', 'diesel', 'parking', 'toll', 'ferry', 'car', 'rental', 'ruter'] },
  { id: 'lodging', label: 'Lodging', icon: BedDouble, keywords: ['airbnb', 'hotel', 'hostel', 'cabin', 'apartment', 'rent', 'booking', 'stay'] },
  { id: 'entertainment', label: 'Fun', icon: Ticket, keywords: ['tickets', 'ticket', 'museum', 'concert', 'cinema', 'movie', 'tour', 'club', 'show', 'game', 'netflix', 'spotify', 'surf'] },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, keywords: ['ikea', 'clothes', 'gift', 'souvenir', 'amazon', 'shop'] },
  { id: 'utilities', label: 'Bills', icon: Zap, keywords: ['electricity', 'power', 'strøm', 'internet', 'wifi', 'water', 'heating', 'phone', 'insurance', 'bill', 'cleaning'] },
  { id: 'travel', label: 'Flights', icon: Plane, keywords: ['flight', 'flights', 'plane', 'airport', 'luggage', 'baggage'] },
  { id: 'health', label: 'Health', icon: HeartPulse, keywords: ['pharmacy', 'apotek', 'doctor', 'medicine', 'sunscreen'] },
  { id: 'other', label: 'Other', icon: Receipt, keywords: [] },
]

const byId = new Map(CATEGORIES.map((c) => [c.id, c]))

export function category(id: CategoryId): Category {
  return byId.get(id) ?? byId.get('other')!
}

/** Guesses a category from an expense title, or null if nothing matches. */
export function guessCategory(title: string): CategoryId | null {
  const words = title.toLowerCase().split(/[^\p{L}\p{N}]+/u)
  for (const c of CATEGORIES) {
    if (c.keywords.some((k) => words.includes(k))) return c.id
  }
  return null
}
