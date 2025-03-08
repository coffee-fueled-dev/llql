import { envar } from "../util/envar";

export const env = envar([
  [
    "APP_BASE_URL",
    {
      required: true,
      parser: (v: string | undefined) => (v ? new URL(v) : undefined),
    },
  ],
  ["PORT", { default: 4000 }],
  [
    "NODE_ENV",
    {
      parser: (
        v: string | undefined
      ): "development" | "production" | undefined => {
        if (!v) return;
        if (v !== "development" && v !== "production")
          throw new Error(`Unexpected value for NODE_ENV: ${v}`);
        return v;
      },
      default: "development",
    },
  ],
  ["OPENAI_API_KEY", { required: true }],
  ["OPENAI_VECTOR_STORE_ID"],
] as const);
