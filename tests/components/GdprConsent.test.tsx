import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GdprConsent } from "@/components/landing/GdprConsent";
import { GDPR_CONSENT_VERSION } from "@/lib/gdpr-consent";

describe("Feature: GDPR consent checkbox", () => {
  describe("Given the form has just rendered", () => {
    it("When inspected, Then the checkbox is unticked", () => {
      render(<GdprConsent onChange={() => {}} />);
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });
  });

  describe("Given the user ticks the checkbox", () => {
    it("When toggled, Then onChange emits consent=true with ISO consentAt and the static version", async () => {
      const onChange = vi.fn();
      render(<GdprConsent onChange={onChange} />);
      await userEvent.click(screen.getByRole("checkbox"));
      expect(onChange).toHaveBeenLastCalledWith({
        consent: true,
        consentAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        version: GDPR_CONSENT_VERSION,
      });
    });
  });

  describe("Given a previously-ticked checkbox", () => {
    it("When unticked, Then onChange emits consent=false with consentAt=null", async () => {
      const onChange = vi.fn();
      render(<GdprConsent onChange={onChange} />);
      const cb = screen.getByRole("checkbox");
      await userEvent.click(cb);
      await userEvent.click(cb);
      expect(onChange).toHaveBeenLastCalledWith({
        consent: false,
        consentAt: null,
        version: GDPR_CONSENT_VERSION,
      });
    });
  });

  describe("Given the consent label", () => {
    it("When rendered, Then it links to /privacy in a new tab", () => {
      render(<GdprConsent onChange={() => {}} />);
      const link = screen.getByRole("link", { name: /politica de confidențialitate/i });
      expect(link).toHaveAttribute("href", "/privacy");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });
});
