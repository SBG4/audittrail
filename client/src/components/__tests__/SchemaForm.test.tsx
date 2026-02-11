import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils/render";
import SchemaForm from "@/components/cases/SchemaForm";
import type { JsonSchema } from "@/types/case";

const schema: JsonSchema = {
  type: "object",
  properties: {
    region: { type: "string", title: "Region" },
    count: { type: "integer", title: "Item Count" },
    priority: {
      type: "string",
      title: "Priority",
      enum: ["low", "medium", "high"],
    },
    email: { type: "string", title: "Contact Email", format: "email" },
  },
  required: ["region"],
};

describe("SchemaForm", () => {
  it("renders fields from schema properties", () => {
    renderWithProviders(
      <SchemaForm
        schema={schema}
        values={{}}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/region/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/item count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
  });

  it("marks required fields with asterisk", () => {
    renderWithProviders(
      <SchemaForm
        schema={schema}
        values={{}}
        onChange={vi.fn()}
      />
    );

    // Region is required — look for the asterisk
    const regionLabel = screen.getByText("Region");
    expect(regionLabel.closest("label")?.querySelector(".text-destructive")).toBeInTheDocument();
  });

  it("renders number input for integer type", () => {
    renderWithProviders(
      <SchemaForm
        schema={schema}
        values={{ count: 5 }}
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText(/item count/i);
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveValue(5);
  });

  it("renders email input for email format", () => {
    renderWithProviders(
      <SchemaForm
        schema={schema}
        values={{ email: "test@example.com" }}
        onChange={vi.fn()}
      />
    );

    const input = screen.getByLabelText(/contact email/i);
    expect(input).toHaveAttribute("type", "email");
  });

  it("calls onChange when text field is modified", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <SchemaForm
        schema={schema}
        values={{ region: "" }}
        onChange={onChange}
      />
    );

    await user.type(screen.getByLabelText(/region/i), "U");
    // onChange is called for the keystroke
    expect(onChange).toHaveBeenCalledTimes(1);
    // Since the component is controlled with values prop, onChange receives
    // the updated values object with the typed character
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ region: "U" }));
  });

  it("disables all fields when disabled is true", () => {
    renderWithProviders(
      <SchemaForm
        schema={schema}
        values={{}}
        onChange={vi.fn()}
        disabled
      />
    );

    expect(screen.getByLabelText(/region/i)).toBeDisabled();
    expect(screen.getByLabelText(/item count/i)).toBeDisabled();
    expect(screen.getByLabelText(/contact email/i)).toBeDisabled();
  });
});
