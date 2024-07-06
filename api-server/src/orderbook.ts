
interface Order {
    price: number;
    quantity: number;
    orderId: string;
}

export interface Bid extends Order {
    side: 'bid';
}

export interface Ask extends Order {
    side: 'ask';
}

export interface Orderbook {
    bids: Bid[];
    asks: Ask[];
}

export const orderbook: Orderbook = {
  bids: [
  ],
  asks: [
    
  ]
}

export const bookWithQuantity: {bids: {[price: number]: number}; asks: {[price: number]: number}} = {
    bids: {},
    asks: {}
}

export const addAndSort = (arr: any, val: any) => {
  arr.push(val);
  let i = arr.length - 1;
  let item = arr[i];
  while (i > 0 && item.price < arr[i-1].price){
    arr[i] = arr[i-1];
    i -= 1;
  }
  arr[i] = item;
  return arr;
}