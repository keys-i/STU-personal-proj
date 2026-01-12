import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate, isoFromDateInput } from "./date";

type IsoCase = {
  title: string;
  input: string;
  expected: string | undefined;
};

describe("date utils", () => {
  describe("isoFromDateInput", () => {
    it.each<IsoCase>([
      { title: "empty string -> undefined", input: "", expected: undefined },
      { title: "whitespace -> undefined", input: "   ", expected: undefined },
      {
        title: "valid date -> iso",
        input: "2025-01-01",
        expected: "2025-01-01T00:00:00.000Z",
      },
      {
        title: "valid date -> iso 2",
        input: "1999-12-31",
        expected: "1999-12-31T00:00:00.000Z",
      },
    ])("$title", ({ input, expected }: IsoCase) => {
      expect(isoFromDateInput(input)).toBe(expected);
    });

    it.each<string>([
      "not-a-date",
      "2025-13-01",
      "2025-00-10",
      "2025-02-30",
      "2025-2-3",
      "2025/02/03",
    ])("returns undefined for invalid input: %s", (input) => {
      expect(isoFromDateInput(input)).toBeUndefined();
    });
  });

  describe("formatDate", () => {
    const realDTF = Intl.DateTimeFormat;

    afterEach(() => {
      Intl.DateTimeFormat = realDTF;
      vi.restoreAllMocks();
    });

    it.each<[undefined | null | ""]>([[undefined], [null], [""]])(
      "returns em dash for %s",
      (v) => {
        expect(formatDate(v)).toBe("—");
      },
    );

    it.each<string>(["not-an-iso", "2025-99-99T00:00:00.000Z"])(
      "returns em dash for invalid ISO: %s",
      (iso) => {
        expect(formatDate(iso)).toBe("—");
      },
    );

    it("formats a valid ISO using Intl.DateTimeFormat (mocked)", () => {
      const formatSpy = vi.fn((d: Date) => `MOCK(${d.toISOString()})`);

      // Constructable mock for `new Intl.DateTimeFormat(...)`
      const MockDTF = function () {
        return {
          format: (d: Date) => formatSpy(d),
        };
      };

      const ctorSpy = vi.fn().mockImplementation(MockDTF);

      // Type-safe replacement (no `any`)
      Intl.DateTimeFormat = ctorSpy as unknown as typeof Intl.DateTimeFormat;

      const iso = "2025-01-01T12:34:56.000Z";
      expect(formatDate(iso)).toBe(`MOCK(${iso})`);

      expect(ctorSpy).toHaveBeenCalledTimes(1);
      expect(formatSpy).toHaveBeenCalledTimes(1);
    });
  });
});
