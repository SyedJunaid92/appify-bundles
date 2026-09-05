export type VariableGroupId =
  | "discount"
  | "product"
  | "unit"
  | "quantity"
  | "subscription"
  | "text";

export interface BarVariable {
  token: string;
  label: string;
}

export interface BarVariableGroup {
  id: VariableGroupId;
  label: string;
  items: BarVariable[];
}

export const BAR_VARIABLE_GROUPS: BarVariableGroup[] = [
  {
    id: "discount",
    label: "Discount",
    items: [
      { token: "{{saved_percentage}}", label: "Saved percentage" },
      { token: "{{saved_total}}", label: "Saved $ total" },
      { token: "{{saved_per_item}}", label: "Saved $ per item" },
    ],
  },
  {
    id: "product",
    label: "Product",
    items: [
      { token: "{{product}}", label: "Product title" },
      { token: "{{variant}}", label: "Variant title" },
      { token: "{{sale_total}}", label: "New total price" },
      { token: "{{sale_per_item}}", label: "New price per item" },
      { token: "{{sale_per_day}}", label: "New price per day" },
      { token: "{{original_total}}", label: "Original total price" },
      { token: "{{original_per_item}}", label: "Original price per item" },
      { token: "{{currency}}", label: "Currency code" },
    ],
  },
  {
    id: "unit",
    label: "Unit pricing",
    items: [
      { token: "{{unit_price}}", label: "New unit price" },
      { token: "{{saved_per_unit}}", label: "Saved $ per unit" },
      { token: "{{original_unit}}", label: "Original unit price" },
      { token: "{{unit_qty}}", label: "Unit quantity" },
    ],
  },
  {
    id: "quantity",
    label: "Quantity",
    items: [
      { token: "{{quantity}}", label: "Quantity" },
      { token: "{{buy_qty}}", label: "Buy quantity" },
      { token: "{{get_qty}}", label: "Get quantity" },
      { token: "{{gift_count}}", label: "Number of free gifts" },
    ],
  },
  {
    id: "subscription",
    label: "Subscription",
    items: [
      { token: "{{selling_plan}}", label: "Selling plan name" },
      { token: "{{selling_plan_discount}}", label: "Selling plan discount" },
    ],
  },
  {
    id: "text",
    label: "Text",
    items: [
      { token: "{{metafield_1}}", label: "Product metafield" },
      { token: "{{metafield_2}}", label: "Product metafield 2" },
      { token: "{{metafield_3}}", label: "Product metafield 3" },
      { token: "{{metafield_4}}", label: "Product metafield 4" },
    ],
  },
];
