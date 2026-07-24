/**
 * Tests unitaires pour RegisterForm.
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { RegisterForm } from "@/components/auth/RegisterForm";

// Mock useRegister
const mockMutate = jest.fn();
jest.mock("@/hooks/auth/useRegister", () => ({
  useRegister: () => ({
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

describe("RegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rend le formulaire avec tous les champs", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Pseudo")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Confirmer le mot de passe"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Créer le compte" }),
    ).toBeInTheDocument();
  });

  it("affiche une erreur pour champs vides", async () => {
    const { container } = render(<RegisterForm />);
    const form = container.querySelector("form");
    if (!form) throw new Error("Form not found");
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText("L'email est requis")).toBeInTheDocument();
      expect(screen.getByText("Le pseudo est requis")).toBeInTheDocument();
      expect(
        screen.getByText("Le mot de passe est requis"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("La confirmation est requise"),
      ).toBeInTheDocument();
    });
  });

  it("affiche une erreur pour email invalide", async () => {
    const { container } = render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid-email" },
    });
    fireEvent.change(screen.getByLabelText("Pseudo"), {
      target: { value: "TestUser" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), {
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

  it("affiche une erreur pour pseudo trop court", async () => {
    const { container } = render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Pseudo"), {
      target: { value: "ab" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "password123" },
    });
    const form = container.querySelector("form");
    if (!form) throw new Error("Form not found");
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(
        screen.getByText("Le pseudo doit contenir au moins 3 caractères"),
      ).toBeInTheDocument();
    });
  });

  it("affiche une erreur pour password trop court", async () => {
    const { container } = render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Pseudo"), {
      target: { value: "TestUser" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "short" },
    });
    const form = container.querySelector("form");
    if (!form) throw new Error("Form not found");
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(
        screen.getByText("Le mot de passe doit contenir au moins 8 caractères"),
      ).toBeInTheDocument();
    });
  });

  it("affiche une erreur pour confirmation qui ne correspond pas", async () => {
    const { container } = render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Pseudo"), {
      target: { value: "TestUser" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "different" },
    });
    const form = container.querySelector("form");
    if (!form) throw new Error("Form not found");
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(
        screen.getByText("Les mots de passe ne correspondent pas"),
      ).toBeInTheDocument();
    });
  });

  it("appelle mutate avec les bonnes données sur submit valide", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText("Pseudo"), {
      target: { value: "TestUser" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirmer le mot de passe"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));
    expect(mockMutate).toHaveBeenCalledWith({
      email: "test@test.com",
      pseudo: "TestUser",
      password: "password123",
    });
  });

  it("n'appelle pas mutate si validation échoue", () => {
    render(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
