import express from "express";
import { OrderInputSchema } from "./types";
import { orderbook, bookWithQuantity, addAndSort, Bid } from "./orderbook";

const BASE_ASSET = 'BTC' ;
const QUOTE_ASSET = 'USD';

const app = express();
app.use(express.json());

let GLOBAL_TRADE_ID = 0;

app.post('/api/v1/order', (req, res) => {
  const order = OrderInputSchema.safeParse(req.body);
  if (!order.success) {
    res.status(400).send(order.error.message);
    return;
  }

  const { baseAsset, quoteAsset, price, quantity, side, kind } = order.data;
  const orderId = getOrderId();

  if (baseAsset !== BASE_ASSET || quoteAsset !== QUOTE_ASSET) {
    res.status(400).send('Invalid base or quote asset');
    return;
  }

  const { executedQty, fills } = fillOrder(orderId, price, quantity, side, kind);

  res.send({
    orderId,
    executedQty,
    fills
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});


function getOrderId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface Fill {
    "price": number,
    "qty": number,
    "tradeId": number,
}



function fillOrder(orderId: string, price: number, quantity: number, side: "buy" | "sell", type?: "ioc"): { status: "rejected" | "accepted"; executedQty: number; fills: Fill[] } {
  const fills: Fill[] = [];
  const maxFillQuantity = getFillQuantity(price, quantity, side);
  let executedQty = 0;

  if (type === 'ioc' && maxFillQuantity < quantity) {
      return { status: 'rejected', executedQty: maxFillQuantity, fills: [] };
  }
  
  if (side === 'buy') {
    let i = 0;
    while (i < orderbook.asks.length && quantity > 0) {
      const o = orderbook.asks[i];
      if (o.price <= price) {
          const filledQuantity = Math.min(quantity, o.quantity);
          o.quantity -= filledQuantity;
          bookWithQuantity.asks[o.price] = (bookWithQuantity.asks[o.price] || 0) - filledQuantity;
          fills.push({
              price: o.price,
              qty: filledQuantity,
              tradeId: GLOBAL_TRADE_ID++
          });
          executedQty += filledQuantity;
          quantity -= filledQuantity;
          if (o.quantity === 0) {
              orderbook.asks.splice(i, 1);
              i--; // Adjust index since we removed an element
          }
          if (bookWithQuantity.asks[o.price] === 0) {
              delete bookWithQuantity.asks[o.price];
          }
      }
      i++;
    }

    // Place on the book if order not filled
    if (quantity !== 0) {
        const item = {
          price,
          quantity: quantity,
          side: 'bid',
          orderId
        }
        orderbook.bids = addAndSort(orderbook.bids, item)
        bookWithQuantity.bids[price] = (bookWithQuantity.bids[price] || 0) + (quantity);
    }
  } else {
    let i = 0;
    while (i < orderbook.bids.length && quantity > 0) {
      const o = orderbook.bids[i];
      if (o.price >= price) {
          const filledQuantity = Math.min(quantity, o.quantity);
          o.quantity -= filledQuantity;
          bookWithQuantity.bids[o.price] = (bookWithQuantity.bids[o.price] || 0) - filledQuantity;
          fills.push({
              price: o.price,
              qty: filledQuantity,
              tradeId: GLOBAL_TRADE_ID++
          });
          executedQty += filledQuantity;
          quantity -= filledQuantity;
          if (o.quantity === 0) {
              orderbook.bids.splice(i, 1);
              i--; // Adjust index since we removed an element
          }
          if (bookWithQuantity.bids[o.price] === 0) {
              delete bookWithQuantity.bids[o.price];
          }
      }
      i++;
    }

    // Place on the book if order not filled
    if (quantity !== 0) {
      const item = {
        price,
        quantity: quantity,
        side: 'ask',
        orderId
      }
      orderbook.asks = addAndSort(orderbook.asks, item)
      bookWithQuantity.asks[price] = (bookWithQuantity.asks[price] || 0) + (quantity);
    }
  }

  console.log(orderbook)
  console.log(bookWithQuantity)

  return {
      status: 'accepted',
      executedQty,
      fills
  }
}

function getFillQuantity(price: number, quantity: number, side: "buy" | "sell"): number {
  let filled = 0

  if(side === "buy"){
    orderbook.asks.forEach(o => {
      if(o.price <= price){
        filled += Math.min(o.quantity, quantity)
      }
    });
  }else{
    orderbook.bids.forEach(o => {
      if(o.price >= price){
        filled += Math.min(o.quantity, quantity)
      }
    })
  }

  return filled
}
