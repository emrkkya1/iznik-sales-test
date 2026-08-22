// Maps camelCase domain items to the snake_case JSONB shape the delivery RPCs expect.
export interface DeliveryItemInput {
  productId: string;
  deliveredQuantity: number;
  returnedQuantity: number;
}

export type DeliveryItemRpcPayload = Record<string, string | number>;

export function toSnakeCaseItems(items: DeliveryItemInput[]): DeliveryItemRpcPayload[] {
  return items.map((item) => ({
    product_id: item.productId,
    delivered_quantity: item.deliveredQuantity,
    returned_quantity: item.returnedQuantity,
  }));
}
