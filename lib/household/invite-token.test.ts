import { describe, expect, it } from "vitest";
import { parseInviteToken } from "./invite-token";

const token = "AbCdEfGhIjKlMnOpQrStUv-_";

describe("parseInviteToken", () => {
  it("accepts a bare token", () => {
    expect(parseInviteToken(token)).toBe(token);
  });

  it("extracts the token from a full link", () => {
    expect(parseInviteToken(`https://recetra.vercel.app/invite/${token}`)).toBe(token);
    expect(parseInviteToken(`  http://localhost:3000/invite/${token}?x=1 `)).toBe(token);
  });

  it("rejects empty or malformed input", () => {
    expect(parseInviteToken("")).toBeNull();
    expect(parseInviteToken("hola")).toBeNull();
    expect(parseInviteToken("https://evil.com/invite/<script>")).toBeNull();
  });
});
