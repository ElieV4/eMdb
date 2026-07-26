import { render, screen } from "@testing-library/react";
import { TitlePoster } from "@/components/titles/TitlePoster";
import { cn } from "@/lib/utils";

jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage(props: any) {
    return (
      <img
        data-testid="poster-img"
        alt={props.alt}
        className={props.className}
      />
    );
  },
}));

describe("TitlePoster", () => {
  it("renders an image element", () => {
    render(<TitlePoster src="/test.jpg" alt="Test" title="Test" />);
    expect(screen.getByTestId("poster-img")).toBeInTheDocument();
  });

  it("renders the Film type badge by default", () => {
    render(<TitlePoster src="/test.jpg" alt="Test" title="Test" />);
    expect(screen.getByText("Film")).toBeInTheDocument();
  });

  it("renders the Série type badge when type is serie", () => {
    render(
      <TitlePoster src="/test.jpg" alt="Test" title="Test" type="serie" />,
    );
    expect(screen.getByText("Série")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <TitlePoster
        src="/test.jpg"
        alt="Test"
        title="Test"
        className="my-class"
      />,
    );
    expect(
      screen.getByTestId("poster-img").closest(".my-class"),
    ).toBeInTheDocument();
  });

  it("uses the placeholder background when no src is provided", () => {
    render(<TitlePoster src={null} alt="Test" title="Test" />);
    const container = screen.getByTestId("poster-img").closest("div");
    expect(container).toBeInTheDocument();
  });
});
