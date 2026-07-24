/**
 * Tests unitaires pour LoginForm.
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

// Mock useLogin
const mockMutate = jest.fn();
jest.mock("@/hooks/auth/useLogin", () => ({
  useLogin: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: false,
  }),
}));

// Mock useRouter
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rend le formulaire avec email, password et bouton", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Se connecter" }),
    ).toBeInTheDocument();
  });

  it("affiche une erreur de validation pour champs vides", async () => {
    const { container } = render(<LoginForm />);
    const form = container.querySelector("form");
    if (!form) throw new Error("Form not found");
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText("L'email est requis")).toBeInTheDocument();
      expect(
        screen.getByText("Le mot de passe est requis"),
      ).toBeInTheDocument();
    });
  });

  it("affiche une erreur pour email invalide", async () => {
    const { container } = render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    const form = container.querySelector("form");
    if (!form) throw new Error("Form not found");
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText("Format d'email invalide")).toBeInTheDocument();
    });
  });

  it("appelle mutate avec les bonnes données sur submit valide", () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(mockMutate).toHaveBeenCalledWith({
      email: "test@test.com",
      password: "password123",
    });
  });

  it("n'appelle pas mutate si validation échoue", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
