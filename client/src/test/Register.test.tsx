import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as client from "../api/client";
import { AuthProvider } from "../context/AuthContext";
import Register from "../pages/Register";

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Register page", () => {
  it("renders all fields", () => {
    renderRegister();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    renderRegister();

    await userEvent.type(screen.getByLabelText("Email"), "a@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "pass123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "different");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it("shows server error on registration failure", async () => {
    vi.spyOn(client, "register").mockRejectedValueOnce(
      new client.ApiError(400, "Email already registered"),
    );
    renderRegister();

    await userEvent.type(screen.getByLabelText("Email"), "taken@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "pass123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "pass123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/email already registered/i),
    ).toBeInTheDocument();
  });
});
