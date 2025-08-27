import Countries from "../../src/client/data/countries.json";
import EnTranslations from "../../resources/lang/en.json";
import { normalizeKeyName } from "../../src/client/Utils";

describe("Country Translations", () => {
  test("all countries in countries.json should have corresponding translation keys in en.json", () => {
    const missingTranslations: string[] = [];

    Countries.forEach((country) => {
      const normalizedKey = normalizeKeyName(country.code);
      const translationKey = `flags.${normalizedKey}`;
      if (!EnTranslations.flags[normalizedKey as keyof typeof EnTranslations.flags]) {
        missingTranslations.push(`Missing translation for "${country.code}" -> "${translationKey}"`);
      }
    });

    if (missingTranslations.length > 0) {
      throw new Error(
        `Found ${missingTranslations.length} missing country translations:\n` +
        missingTranslations.join("\n") +
        "\n\nPlease add the missing translations to resources/lang/en.json",
      );
    }
  });

  test("country code normalization should work correctly", () => {
    expect(normalizeKeyName("xx")).toBe("xx");
    expect(normalizeKeyName("Abbasid Caliphate")).toBe("abbasid_caliphate");
    expect(normalizeKeyName("sh-ac")).toBe("sh-ac");
    expect(normalizeKeyName("1_Airgialla")).toBe("1_airgialla");
    expect(normalizeKeyName("United States")).toBe("united_states");
    expect(normalizeKeyName("Côte d'Ivoire")).toBe("cote_divoire");
  });

  test("translation keys should have non-empty values", () => {
    const emptyTranslations: string[] = [];

    Object.entries(EnTranslations.flags).forEach(([key, value]) => {
      if (!value || value.trim() === "") {
        emptyTranslations.push(key);
      }
    });

    expect(emptyTranslations).toEqual([]);
  });
});
