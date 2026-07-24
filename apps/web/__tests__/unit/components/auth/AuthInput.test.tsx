/**
 * Tests unitaires pour AuthInput.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { AuthInput } from "@/components/auth/AuthInput";

describe("AuthInput", () => {
  it("rend le label et l'input", () => {
    render(
      <AuthInput label="Email" name="email" value="" onChange={() => {}} />,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
  });

  it("rend l'input avec le bon type", () => {
    render(
      <AuthInput
        label="Mot de passe"
        name="password"
        type="password"
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("affiche le message d'erreur quand fourni", () => {
    render(
      <AuthInput
        label="Email"
        name="email"
        value=""
        onChange={() => {}}
        error="Email invalide"
      />,
    );
    expect(screen.getByText("Email invalide")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("n'affiche pas d'erreur quand non fourni", () => {
    render(
      <AuthInput label="Email" name="email" value="" onChange={() => {}} />,
    );
    expect(screen.queryByText("Email invalide")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("appelle onChange avec la nouvelle valeur", () => {
    const onChange = jest.fn();
    render(
      <AuthInput label="Email" name="email" value="" onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Email" }), {
      target: { value: "test@test.com" },
    });
    expect(onChange).toHaveBeenCalledWith("test@test.com");
  });

  it("rend le placeholder quand fourni", () => {
    render(
      <AuthInput
        label="Email"
        name="email"
        value=""
        onChange={() => {}}
        placeholder="vous@exemple.com"
      />,
    );
    expect(screen.getByPlaceholderText("vous@exemple.com")).toBeInTheDocument();
  });
});
