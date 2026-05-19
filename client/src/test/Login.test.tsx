import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "../api/client";
import { AuthProvider } from "../context/AuthContext";
import Login from "../pages/Login";

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("Login page", () => {
  it("renders email and password fields", () => {
    renderLogin();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows error message on failed login", async () => {
    vi.spyOn(client, "login").mockRejectedValueOnce(
      new client.ApiError(401, "Invalid credentials"),
    );
    renderLogin();

    await userEvent.type(screen.getByLabelText("Email"), "bad@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("disables button while submitting", async () => {
    vi.spyOn(client, "login").mockReturnValueOnce(new Promise(() => {}));
    renderLogin();

    await userEvent.type(screen.getByLabelText("Email"), "a@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "pass123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });
});
