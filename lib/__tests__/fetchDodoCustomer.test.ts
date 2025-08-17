import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/dodo", () => {
  const customers = {
    list: vi.fn(),
    retrieve: vi.fn(),
  };
  return { dodoClient: { customers } };
});

// Import after mocks so helper uses the mocked client
import { fetchDodoCustomerByEmail, fetchDodoCustomerById } from "@/lib/fetchDodoCustomer";
import { dodoClient } from "@/lib/dodo";

describe("fetchDodoCustomer helpers", () => {
  beforeEach(() => {
    ((dodoClient as any).customers.list as any).mockReset();
    ((dodoClient as any).customers.retrieve as any).mockReset();
  });

  it("returns first customer by email when found", async () => {
    const cust = { customer_id: "cus_1", email: "a@example.com", name: "A", created_at: "", business_id: "b" };
    ((dodoClient as any).customers.list as any).mockResolvedValue({ items: [cust] });
    const result = await fetchDodoCustomerByEmail("a@example.com");
    expect(result).toEqual(cust);
    expect((dodoClient as any).customers.list).toHaveBeenCalledWith({ email: "a@example.com", page_size: 1 });
  });

  it("returns null by email when none found", async () => {
    ((dodoClient as any).customers.list as any).mockResolvedValue({ items: [] });
    const result = await fetchDodoCustomerByEmail("missing@example.com");
    expect(result).toBeNull();
  });

  it("returns customer by id when found", async () => {
    const cust = { customer_id: "cus_2", email: "b@example.com", name: "B", created_at: "", business_id: "b" };
    ((dodoClient as any).customers.retrieve as any).mockResolvedValue(cust);
    const result = await fetchDodoCustomerById("cus_2");
    expect(result).toEqual(cust);
    expect((dodoClient as any).customers.retrieve).toHaveBeenCalledWith("cus_2");
  });

  it("returns null by id on error", async () => {
    ((dodoClient as any).customers.retrieve as any).mockRejectedValue(new Error("not found"));
    const result = await fetchDodoCustomerById("unknown");
    expect(result).toBeNull();
  });
});
