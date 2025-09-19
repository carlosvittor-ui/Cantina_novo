
export enum PaymentMethod {
  Cash = 'Cash',
  Pix = 'Pix',
}

export interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
  category: 'Alimentos' | 'Loja';
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  pricePerItem: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
}

export type View = 'register' | 'sales' | 'report' | 'previousReport';

export interface CashDrawer {
  isOpen: boolean;
  openingCash: number;
  previousClosingCash: number;
}

export interface Withdrawal {
    id: string;
    amount: number;
    reason: string;
    timestamp: Date;
}

export interface HistoricalReport {
  openingCash: number;
  closingCash: number;
  date: string;
  withdrawals: Withdrawal[];
}