import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CitiesQuestion } from "@/components/landing/CitiesQuestion";

describe("Feature: role-driven cities question", () => {
  describe("Given role=expeditor", () => {
    it("When rendered, Then it shows the sender label", () => {
      render(<CitiesQuestion role="expeditor" value={[]} onChange={() => {}} />);
      expect(
        screen.getByText(/de unde trimiți și unde trebuie să ajungă/i),
      ).toBeInTheDocument();
    });
  });

  describe("Given role=destinatar", () => {
    it("When rendered, Then it shows the receiver label", () => {
      render(<CitiesQuestion role="destinatar" value={[]} onChange={() => {}} />);
      expect(
        screen.getByText(/de unde pleacă pachetul tău și unde trebuie să ajungă/i),
      ).toBeInTheDocument();
    });
  });

  describe("Given role=transportator", () => {
    it("When rendered, Then it shows the transporter label", () => {
      render(<CitiesQuestion role="transportator" value={[]} onChange={() => {}} />);
      expect(
        screen.getByText(/de unde pleci și prin ce orașe livrezi pachete/i),
      ).toBeInTheDocument();
    });
  });

  describe("Given two chips on any role", () => {
    it.each(["expeditor", "destinatar", "transportator"] as const)(
      "When role=%s, Then Plecare and Destinație badges are visible",
      (role) => {
        const { unmount } = render(
          <CitiesQuestion role={role} value={["A", "B"]} onChange={() => {}} />,
        );
        expect(screen.getByText("Plecare")).toBeInTheDocument();
        expect(screen.getByText("Destinație")).toBeInTheDocument();
        unmount();
      },
    );
  });

  describe("Given a chip is removed", () => {
    it("When the × is clicked, Then onChange forwards the new array", async () => {
      const onChange = vi.fn();
      render(<CitiesQuestion role="expeditor" value={["A"]} onChange={onChange} />);
      await userEvent.click(screen.getByLabelText(/Elimină A/i));
      await waitFor(() => expect(onChange).toHaveBeenCalledWith([]));
    });
  });
});
