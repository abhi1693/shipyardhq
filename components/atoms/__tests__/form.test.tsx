import { describe, it, expect } from "vitest"
import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { useForm } from "react-hook-form"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/atoms/form"
import { Input } from "@/components/atoms/input"

function DemoForm() {
  const form = useForm<{ name: string }>({ defaultValues: { name: "" } })
  // Set an error so FormMessage renders after mount
  React.useEffect(() => {
    form.setError("name", { type: "required", message: "Name required" })
  }, [])
  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormDescription>Enter your name</FormDescription>
              <FormControl>
                <Input placeholder="type" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

describe("Form atoms", () => {
  it("renders label, description, control and message", async () => {
    render(<DemoForm />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Enter your name")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText("Name required")).toBeInTheDocument(),
    )
  })
})
