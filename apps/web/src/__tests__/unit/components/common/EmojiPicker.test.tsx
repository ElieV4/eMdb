/**
 * Tests unitaires : choix d'emoji (listes, groupes) et dialogue de
 * sous-groupe avec emoji.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import { EmojiPicker, withEmoji } from "@/components/common/EmojiPicker";
import { GroupNameDialog } from "@/components/lists/GroupNameDialog";

function Harness({ initial = null as string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <EmojiPicker value={value} onChange={setValue} label="Emoji de la liste" />
      <output data-testid="value">{value ?? "aucun"}</output>
    </>
  );
}

describe("EmojiPicker", () => {
  it("choisit un emoji dans la grille", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Emoji de la liste" }));
    fireEvent.click(await screen.findByRole("option", { name: "🎾" }));
    expect(screen.getByTestId("value")).toHaveTextContent("🎾");
  });

  it("accepte un autre emoji collé, et « Aucun » l'efface", async () => {
    render(<Harness initial="🎬" />);
    fireEvent.click(screen.getByRole("button", { name: /Emoji de la liste/ }));
    fireEvent.change(await screen.findByLabelText("Autre emoji"), { target: { value: "🦖" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.getByTestId("value")).toHaveTextContent("🦖");

    fireEvent.click(screen.getByRole("button", { name: /Emoji de la liste/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Aucun emoji" }));
    expect(screen.getByTestId("value")).toHaveTextContent("aucun");
  });

  it("withEmoji : emoji devant le nom, s'il y en a un", () => {
    expect(withEmoji("Sport", "⚽")).toBe("⚽ Sport");
    expect(withEmoji("Sport", null)).toBe("Sport");
  });
});

describe("GroupNameDialog", () => {
  it("envoie le nom et l'emoji choisis", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <GroupNameDialog
        open
        onOpenChange={jest.fn()}
        title="Nouveau sous-groupe"
        initialName=""
        submitLabel="Créer"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Tennis" } });
    fireEvent.click(screen.getByRole("button", { name: "Emoji du sous-groupe" }));
    fireEvent.click(await screen.findByRole("option", { name: "🎾" }));
    fireEvent.click(screen.getByRole("button", { name: "Créer" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("Tennis", "🎾"));
  });
});
