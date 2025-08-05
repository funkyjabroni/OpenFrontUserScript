import { UserMeResponse } from "../core/ApiSchemas";
import { Cosmetics, CosmeticsSchema, Pattern } from "../core/CosmeticSchemas";
import { getApiBase, getAuthHeader } from "./jwt";

export async function patterns(
  userMe: UserMeResponse | null,
): Promise<Pattern[]> {
  const cosmetics = await getCosmetics();

  if (cosmetics === undefined) {
    return [];
  }

  const patterns: Pattern[] = [];
  const playerFlares = new Set(userMe?.player.flares);

  for (const name in cosmetics.patterns) {
    const patternData = cosmetics.patterns[name];
    const hasAccess = playerFlares.has(`pattern:${name}`);
    if (hasAccess) {
      // Remove product info because player already has access.
      patternData.product = null;
      patterns.push(patternData);
    } else if (patternData.product !== null) {
      // Player doesn't have access, but product is available for purchase.
      patterns.push(patternData);
    }
    // If player doesn't have access and product is null, don't show it.
  }
  return patterns;
}

export async function handlePurchase(priceId: string) {
  const response = await fetch(
    `${getApiBase()}/stripe/create-checkout-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        priceId: priceId,

        successUrl: `${window.location.href}purchase-success`,
        cancelUrl: `${window.location.href}purchase-cancel`,
      }),
    },
  );

  if (!response.ok) {
    console.error(
      `Error purchasing pattern:${response.status} ${response.statusText}`,
    );
    if (response.status === 401) {
      alert("You are not logged in. Please log in to purchase a pattern.");
    } else {
      alert("Something went wrong. Please try again later.");
    }
    return;
  }

  const { url } = await response.json();

  // Redirect to Stripe checkout
  window.location.href = url;
}

async function getCosmetics(): Promise<Cosmetics | undefined> {
  try {
    const response = await fetch(`${getApiBase()}/cosmetics.json`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return;
    }
    const result = CosmeticsSchema.safeParse(await response.json());
    if (!result.success) {
      console.error(`Invalid cosmetics: ${result.error.message}`);
      return;
    }
    return result.data;
  } catch (error) {
    console.error("Error getting cosmetics:", error);
  }
}
