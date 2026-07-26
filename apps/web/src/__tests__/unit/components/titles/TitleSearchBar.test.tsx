import { render, screen } from "@testing-library/react";
import { TitleSearchBar } from "@/components/titles/TitleSearchBar";

jest.mock("@/hooks/api/useSearch", () => ({
  __esModule: true,
  useSearch: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

import { useSearch } from "@/hooks/api/useSearch";

const mockUseSearch = useSearch as jest.MockedFunction<typeof useSearch>;

const mockData = {
  titles: { items: [], total: 0, page: 1, limit: 5, totalPages: 0 },
  people: { items: [], total: 0, page: 1, limit: 5, totalPages: 0 },
  query: "",
};

describe("TitleSearchBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a search input element", () => {
    mockUseSearch.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });
    render(<TitleSearchBar />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("calls onSearch prop on form submission", () => {
    mockUseSearch.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });
    const onSearch = jest.fn();
    render(<TitleSearchBar onSearch={onSearch} />);
  });

  it("applies a custom className to the container", () => {
    mockUseSearch.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });
    render(<TitleSearchBar className="my-custom-class" />);
    const input = screen.getByRole("searchbox");
    expect(input.closest(".my-custom-class")).toBeInTheDocument();
  });

  it("passes custom placeholder to the input", () => {
    mockUseSearch.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });
    render(<TitleSearchBar placeholder="Custom search" />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("placeholder", "Custom search");
  });
});
